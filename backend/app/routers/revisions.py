from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_share import ProjectShare
from app.models.project_revision import ProjectRevision
from app.models.pq_item import PQItem
from app.models.proposal import Proposal
from app.models.proposal_item import ProposalItem
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


def _check_project(db: Session, project_id: int, user_id: int) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    if project.user_id != user_id:
        share = db.query(ProjectShare).filter(
            ProjectShare.project_id == project_id,
            ProjectShare.user_id == user_id,
        ).first()
        if not share:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project


def _get_revision(db: Session, project_id: int, numero: int) -> ProjectRevision:
    rev = db.query(ProjectRevision).filter(
        ProjectRevision.project_id == project_id,
        ProjectRevision.numero == numero,
    ).first()
    if not rev:
        raise HTTPException(status_code=404, detail=f"Revisão {numero} não encontrada")
    return rev


class RevisionCreate(BaseModel):
    numero: int
    descricao: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/revisions")
def list_revisions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project(db, project_id, current_user.id)
    revs = (
        db.query(ProjectRevision)
        .filter(ProjectRevision.project_id == project_id)
        .order_by(ProjectRevision.numero.asc())
        .all()
    )
    return [
        {
            "id": r.id,
            "project_id": r.project_id,
            "numero": r.numero,
            "descricao": r.descricao,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in revs
    ]


@router.post("/projects/{project_id}/revisions", status_code=status.HTTP_201_CREATED)
def create_revision(
    project_id: int,
    data: RevisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project(db, project_id, current_user.id)
    existing = db.query(ProjectRevision).filter(
        ProjectRevision.project_id == project_id,
        ProjectRevision.numero == data.numero,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Revisão {data.numero} já existe")
    rev = ProjectRevision(project_id=project_id, numero=data.numero, descricao=data.descricao)
    db.add(rev)
    db.commit()
    db.refresh(rev)
    return {
        "id": rev.id,
        "project_id": rev.project_id,
        "numero": rev.numero,
        "descricao": rev.descricao,
        "created_at": rev.created_at.isoformat() if rev.created_at else None,
    }


@router.delete("/projects/{project_id}/revisions/{revision_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_revision(
    project_id: int,
    revision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project(db, project_id, current_user.id)
    rev = db.query(ProjectRevision).filter(
        ProjectRevision.id == revision_id,
        ProjectRevision.project_id == project_id,
    ).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Revisão não encontrada")
    if rev.numero == 0:
        raise HTTPException(status_code=400, detail="A Revisão 0 não pode ser excluída")
    db.delete(rev)
    db.commit()


def _build_compare_data(db: Session, project_id: int, rev_a: int, rev_b: int) -> dict:
    """Constrói os dados de comparação entre duas revisões."""
    revision_a = _get_revision(db, project_id, rev_a)
    revision_b = _get_revision(db, project_id, rev_b)

    pq_a = {
        item.numero_item: item
        for item in db.query(PQItem).filter(PQItem.revision_id == revision_a.id).all()
    }
    pq_b = {
        item.numero_item: item
        for item in db.query(PQItem).filter(PQItem.revision_id == revision_b.id).all()
    }

    proposals_a = db.query(Proposal).filter(Proposal.revision_id == revision_a.id).all()
    proposals_b = db.query(Proposal).filter(Proposal.revision_id == revision_b.id).all()

    def proposal_total(proposal: Proposal) -> float:
        total = Decimal("0")
        for item in proposal.items:
            if item.preco_total:
                total += item.preco_total
        return float(total)

    total_a = sum(proposal_total(p) for p in proposals_a)
    total_b = sum(proposal_total(p) for p in proposals_b)
    delta = total_b - total_a
    delta_pct = ((delta / total_a) * 100) if total_a != 0 else 0.0

    all_items: list[dict] = []
    all_nums = set(pq_a.keys()) | set(pq_b.keys())

    for num in sorted(all_nums):
        item_a = pq_a.get(num)
        item_b = pq_b.get(num)

        # Dimensões: prioridade para B (mais recente), fallback A
        ref_item = item_b or item_a
        localidade = ref_item.localidade
        disciplina = ref_item.disciplina
        categoria = ref_item.categoria
        unidade = ref_item.unidade

        qty_a = float(item_a.quantidade or 0) if item_a else None
        qty_b = float(item_b.quantidade or 0) if item_b else None
        pref_a = float(item_a.preco_referencia or 0) if item_a and item_a.preco_referencia else None
        pref_b = float(item_b.preco_referencia or 0) if item_b and item_b.preco_referencia else None

        if item_a and item_b:
            val_a = float(item_a.preco_referencia or 0) * float(item_a.quantidade or 0)
            val_b = float(item_b.preco_referencia or 0) * float(item_b.quantidade or 0)
            d = val_b - val_a
            d_pct = ((d / val_a) * 100) if val_a != 0 else 0.0
            pq_changes = []
            for field in ("descricao", "unidade", "quantidade"):
                va = getattr(item_a, field)
                vb = getattr(item_b, field)
                if str(va) != str(vb):
                    pq_changes.append({"field": field, "valor_a": va, "valor_b": vb})
            s = "changed" if (d != 0 or pq_changes) else "unchanged"
            all_items.append({
                "numero_item": num,
                "descricao": item_b.descricao,
                "localidade": localidade,
                "disciplina": disciplina,
                "categoria": categoria,
                "unidade": unidade,
                "status": s,
                "quantidade_a": qty_a,
                "quantidade_b": qty_b,
                "preco_referencia_a": pref_a,
                "preco_referencia_b": pref_b,
                "valor_a": val_a,
                "valor_b": val_b,
                "delta": d,
                "delta_pct": d_pct,
                "pq_change": pq_changes if pq_changes else None,
            })
        elif item_a:
            val_a = float(item_a.preco_referencia or 0) * float(item_a.quantidade or 0)
            all_items.append({
                "numero_item": num,
                "descricao": item_a.descricao,
                "localidade": localidade,
                "disciplina": disciplina,
                "categoria": categoria,
                "unidade": unidade,
                "status": "removed",
                "quantidade_a": qty_a,
                "quantidade_b": None,
                "preco_referencia_a": pref_a,
                "preco_referencia_b": None,
                "valor_a": val_a,
                "valor_b": None,
                "delta": -val_a,
                "delta_pct": -100.0,
                "pq_change": None,
            })
        else:
            val_b = float(item_b.preco_referencia or 0) * float(item_b.quantidade or 0)
            all_items.append({
                "numero_item": num,
                "descricao": item_b.descricao,
                "localidade": localidade,
                "disciplina": disciplina,
                "categoria": categoria,
                "unidade": unidade,
                "status": "added",
                "quantidade_a": None,
                "quantidade_b": qty_b,
                "preco_referencia_a": None,
                "preco_referencia_b": pref_b,
                "valor_a": None,
                "valor_b": val_b,
                "delta": val_b,
                "delta_pct": None,
                "pq_change": None,
            })

    pq_change_items = [i for i in all_items if i.get("pq_change")]

    # by_discipline
    disc_map: dict[str, dict] = {}
    for item in all_items:
        disc = item["disciplina"] or "Sem Disciplina"
        if disc not in disc_map:
            disc_map[disc] = {"disciplina": disc, "total_a": 0.0, "total_b": 0.0,
                               "qty_a": 0.0, "qty_b": 0.0}
        disc_map[disc]["total_a"] += item.get("valor_a") or 0
        disc_map[disc]["total_b"] += item.get("valor_b") or 0
        disc_map[disc]["qty_a"] += item.get("quantidade_a") or 0
        disc_map[disc]["qty_b"] += item.get("quantidade_b") or 0
    by_discipline = []
    for v in disc_map.values():
        d = v["total_b"] - v["total_a"]
        d_pct = ((d / v["total_a"]) * 100) if v["total_a"] != 0 else 0.0
        by_discipline.append({**v, "delta": d, "delta_pct": d_pct})

    # by_category
    cat_map: dict[str, dict] = {}
    for item in all_items:
        cat = item["categoria"] or "Sem Categoria"
        if cat not in cat_map:
            cat_map[cat] = {"categoria": cat, "total_a": 0.0, "total_b": 0.0,
                            "qty_a": 0.0, "qty_b": 0.0}
        cat_map[cat]["total_a"] += item.get("valor_a") or 0
        cat_map[cat]["total_b"] += item.get("valor_b") or 0
        cat_map[cat]["qty_a"] += item.get("quantidade_a") or 0
        cat_map[cat]["qty_b"] += item.get("quantidade_b") or 0
    by_category = []
    for v in cat_map.values():
        d = v["total_b"] - v["total_a"]
        d_pct = ((d / v["total_a"]) * 100) if v["total_a"] != 0 else 0.0
        by_category.append({**v, "delta": d, "delta_pct": d_pct})

    # by_localidade
    loc_map: dict[str, dict] = {}
    for item in all_items:
        loc = item["localidade"] or "Sem Localidade"
        if loc not in loc_map:
            loc_map[loc] = {"localidade": loc, "total_a": 0.0, "total_b": 0.0,
                            "qty_a": 0.0, "qty_b": 0.0,
                            "count_added": 0, "count_removed": 0,
                            "count_changed": 0, "count_unchanged": 0}
        loc_map[loc]["total_a"] += item.get("valor_a") or 0
        loc_map[loc]["total_b"] += item.get("valor_b") or 0
        loc_map[loc]["qty_a"] += item.get("quantidade_a") or 0
        loc_map[loc]["qty_b"] += item.get("quantidade_b") or 0
        loc_map[loc][f"count_{item['status']}"] += 1
    by_localidade = []
    for v in loc_map.values():
        d = v["total_b"] - v["total_a"]
        d_pct = ((d / v["total_a"]) * 100) if v["total_a"] != 0 else 0.0
        by_localidade.append({**v, "delta": d, "delta_pct": d_pct})

    pq_a_items = list(pq_a.values())
    pq_b_items = list(pq_b.values())
    pq_a_sum_qty = sum(float(i.quantidade or 0) for i in pq_a_items)
    pq_b_sum_qty = sum(float(i.quantidade or 0) for i in pq_b_items)
    pq_a_sum_valor = sum(
        float(i.quantidade or 0) * float(i.preco_referencia or 0)
        for i in pq_a_items if i.preco_referencia
    )
    pq_b_sum_valor = sum(
        float(i.quantidade or 0) * float(i.preco_referencia or 0)
        for i in pq_b_items if i.preco_referencia
    )

    return {
        "rev_a": rev_a,
        "rev_b": rev_b,
        "global": {
            "total_a": total_a,
            "total_b": total_b,
            "delta": delta,
            "delta_pct": delta_pct,
        },
        "pq_stats": {
            "count_a": len(pq_a_items),
            "count_b": len(pq_b_items),
            "sum_qty_a": round(pq_a_sum_qty, 4),
            "sum_qty_b": round(pq_b_sum_qty, 4),
            "sum_valor_a": round(pq_a_sum_valor, 2),
            "sum_valor_b": round(pq_b_sum_valor, 2),
        },
        "proposals_a": [
            {"empresa": p.empresa, "valor_total": proposal_total(p), "status": p.status.value}
            for p in proposals_a
        ],
        "proposals_b": [
            {"empresa": p.empresa, "valor_total": proposal_total(p), "status": p.status.value}
            for p in proposals_b
        ],
        "by_discipline": by_discipline,
        "by_category": by_category,
        "by_localidade": by_localidade,
        "by_item": all_items,
        "pq_changes": pq_change_items,
    }


@router.get("/projects/{project_id}/revisions/compare")
def compare_revisions(
    project_id: int,
    rev_a: int = Query(..., description="Número da revisão A"),
    rev_b: int = Query(..., description="Número da revisão B"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project(db, project_id, current_user.id)
    return _build_compare_data(db, project_id, rev_a, rev_b)


@router.get("/projects/{project_id}/revisions/export")
def export_revision_compare(
    project_id: int,
    rev_a: int = Query(...),
    rev_b: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta o comparativo entre duas revisões em Excel (2 abas)."""
    project = _check_project(db, project_id, current_user.id)
    data = _build_compare_data(db, project_id, rev_a, rev_b)

    from app.services.excel import gerar_comparativo_revisoes
    buf = gerar_comparativo_revisoes(project.nome, data)

    safe_name = "".join(c for c in project.nome if c.isalnum() or c in " _-")[:40]
    filename = f"comparativo_rev{rev_a}_rev{rev_b}_{safe_name}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
