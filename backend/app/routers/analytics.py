from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_revision import ProjectRevision
from app.models.pq_item import PQItem
from app.models.proposal import Proposal
from app.schemas.analytics import ParetoData, EqualizationResponse, DisciplineSummary, CategoriaSummary
from app.services.analytics import AnalyticsService
from app.services.excel import gerar_relatorio_equalizacao, gerar_baseline_excel
from typing import List, Optional

router = APIRouter()


@router.get("/pareto/{project_id}", response_model=ParetoData)
def get_pareto(
    project_id: int,
    source: str = Query(default="referencia", enum=["referencia", "propostas"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Curva ABC / Pareto dos itens do projeto."""
    return AnalyticsService.get_pareto(db, project_id, source)


@router.get("/equalization/{project_id}", response_model=EqualizationResponse)
def get_equalization(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tabela de equalização — todas as propostas lado a lado."""
    return AnalyticsService.get_equalization(db, project_id)


@router.get("/disciplines/{project_id}", response_model=list[DisciplineSummary])
def get_disciplines(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AnalyticsService.get_discipline_summary(db, project_id)


@router.get("/categorias/{project_id}", response_model=list[CategoriaSummary])
def get_categorias(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AnalyticsService.get_categoria_summary(db, project_id)


@router.get("/scope-validation/{project_id}")
def scope_validation(
    project_id: int,
    revision_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Valida diferenças de escopo entre propostas e a PQ para uma revisão."""
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # Get the target revision (or latest)
    if revision_id:
        revision = db.query(ProjectRevision).filter(ProjectRevision.id == revision_id).first()
        if not revision or revision.project_id != project_id:
            raise HTTPException(status_code=404, detail="Revisão não encontrada")
    else:
        revision = (
            db.query(ProjectRevision)
            .filter(ProjectRevision.project_id == project_id)
            .order_by(ProjectRevision.numero.desc())
            .first()
        )
        if not revision:
            raise HTTPException(status_code=404, detail="Nenhuma revisão encontrada")

    # Get PQ items for this revision indexed by id
    pq_items = {
        item.id: item
        for item in db.query(PQItem).filter(PQItem.revision_id == revision.id).all()
    }

    # Get proposals for this revision
    proposals = db.query(Proposal).filter(
        Proposal.project_id == project_id,
        Proposal.revision_id == revision.id,
    ).all()

    result_proposals = []
    any_changes = False

    for proposal in proposals:
        changes = []
        for pi in proposal.items:
            pq = pq_items.get(pi.pq_item_id)
            if not pq:
                continue
            changed_fields = []
            if pi.descricao_proposta and pi.descricao_proposta.strip() != (pq.descricao or "").strip():
                changed_fields.append("descricao")
            if pi.unidade_proposta and pi.unidade_proposta.strip() != (pq.unidade or "").strip():
                changed_fields.append("unidade")
            if pi.quantidade_proposta is not None and abs(float(pi.quantidade_proposta) - float(pq.quantidade or 0)) > 0.0001:
                changed_fields.append("quantidade")
            if changed_fields:
                changes.append({
                    "numero_item": pq.numero_item,
                    "descricao_pq": pq.descricao,
                    "descricao_proposta": pi.descricao_proposta,
                    "unidade_pq": pq.unidade,
                    "unidade_proposta": pi.unidade_proposta,
                    "quantidade_pq": float(pq.quantidade or 0),
                    "quantidade_proposta": float(pi.quantidade_proposta) if pi.quantidade_proposta else None,
                    "changed_fields": changed_fields,
                })
        if changes:
            any_changes = True
        result_proposals.append({
            "id": proposal.id,
            "empresa": proposal.empresa,
            "has_changes": len(changes) > 0,
            "changes": changes,
        })

    return {
        "revision_id": revision.id,
        "revision_numero": revision.numero,
        "proposals": result_proposals,
        "any_changes": any_changes,
    }


@router.get("/baseline")
def get_baseline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna todas as propostas vencedoras de todos os projetos do usuário."""
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    project_map = {p.id: p for p in projects}
    project_ids = list(project_map.keys())

    if not project_ids:
        return []

    winners = (
        db.query(Proposal)
        .filter(Proposal.project_id.in_(project_ids), Proposal.is_winner == True)  # noqa: E712
        .order_by(Proposal.updated_at.desc())
        .all()
    )

    entries = []
    for proposal in winners:
        project = project_map[proposal.project_id]

        pq_q = db.query(PQItem).filter(PQItem.project_id == proposal.project_id)
        if proposal.revision_id:
            pq_q = pq_q.filter(PQItem.revision_id == proposal.revision_id)
        pq_map = {item.id: item for item in pq_q.order_by(PQItem.ordem).all()}

        items = []
        total = Decimal("0")
        for pi in proposal.items:
            pq = pq_map.get(pi.pq_item_id)
            if not pq:
                continue
            preco_total = pi.preco_total or Decimal("0")
            total += preco_total
            items.append({
                "pq_item_id": pi.pq_item_id,
                "numero_item": pq.numero_item,
                "descricao": pq.descricao,
                "unidade": pq.unidade,
                "quantidade": float(pq.quantidade or 0),
                "categoria": pq.categoria,
                "disciplina": pq.disciplina,
                "preco_unitario": float(pi.preco_unitario) if pi.preco_unitario else None,
                "preco_total": float(preco_total),
            })

        entries.append({
            "project_id": project.id,
            "project_nome": project.nome,
            "numero_licitacao": project.numero_licitacao,
            "tipo_obra": project.tipo_obra.value,
            "extensao_km": float(project.extensao_km) if project.extensao_km else None,
            "proposal_id": proposal.id,
            "empresa": proposal.empresa,
            "cnpj": proposal.cnpj,
            "bdi_global": float(proposal.bdi_global or 0),
            "valor_total": float(total),
            "data_premiacao": (proposal.updated_at or proposal.created_at).isoformat(),
            "items": items,
        })

    return entries


@router.get("/baseline/export")
def export_baseline_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta o Baseline completo em Excel (multi-aba)."""
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    project_map = {p.id: p for p in projects}
    project_ids = list(project_map.keys())

    winners = (
        db.query(Proposal)
        .filter(Proposal.project_id.in_(project_ids), Proposal.is_winner == True)  # noqa: E712
        .order_by(Proposal.updated_at.desc())
        .all()
    ) if project_ids else []

    entries = []
    for proposal in winners:
        project = project_map[proposal.project_id]
        pq_q = db.query(PQItem).filter(PQItem.project_id == proposal.project_id)
        if proposal.revision_id:
            pq_q = pq_q.filter(PQItem.revision_id == proposal.revision_id)
        pq_map_local = {item.id: item for item in pq_q.order_by(PQItem.ordem).all()}

        items = []
        total = Decimal("0")
        for pi in proposal.items:
            pq = pq_map_local.get(pi.pq_item_id)
            if not pq:
                continue
            preco_total = pi.preco_total or Decimal("0")
            total += preco_total
            items.append({
                "pq_item_id": pi.pq_item_id,
                "numero_item": pq.numero_item,
                "descricao": pq.descricao,
                "unidade": pq.unidade,
                "quantidade": float(pq.quantidade or 0),
                "categoria": pq.categoria,
                "disciplina": pq.disciplina,
                "preco_unitario": float(pi.preco_unitario) if pi.preco_unitario else None,
                "preco_total": float(preco_total),
            })

        entries.append({
            "project_id": project.id,
            "project_nome": project.nome,
            "numero_licitacao": project.numero_licitacao,
            "tipo_obra": project.tipo_obra.value,
            "extensao_km": float(project.extensao_km) if project.extensao_km else None,
            "proposal_id": proposal.id,
            "empresa": proposal.empresa,
            "cnpj": proposal.cnpj,
            "bdi_global": float(proposal.bdi_global or 0),
            "valor_total": float(total),
            "data_premiacao": (proposal.updated_at or proposal.created_at).isoformat(),
            "items": items,
        })

    buf = gerar_baseline_excel(entries)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="baseline_contratos.xlsx"'},
    )


@router.get("/export/{project_id}")
def export_analytics_excel(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta relatório completo de equalização em Excel (5 abas)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    eq_data = AnalyticsService.get_equalization(db, project_id)
    pareto_data = AnalyticsService.get_pareto(db, project_id, "referencia")

    # Converte para dict serializável
    def _to_dict(obj):
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        if hasattr(obj, "dict"):
            return obj.dict()
        return {}

    buf = gerar_relatorio_equalizacao(
        project.nome,
        _to_dict(eq_data),
        _to_dict(pareto_data),
    )
    safe_name = "".join(c for c in project.nome if c.isalnum() or c in " _-")[:40]
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="equalizacao_{safe_name}.xlsx"'
        },
    )
