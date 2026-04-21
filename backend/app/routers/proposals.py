from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.pq_item import PQItem
from app.models.proposal import Proposal
from app.models.proposal_item import ProposalItem
from app.schemas.proposal import (
    ProposalCreate, ProposalUpdate, ProposalResponse,
    ProposalWithItems, ProposalItemsBulkUpdate,
)
from app.services.excel import gerar_modelo_proposta, importar_proposta_excel

router = APIRouter()


def _check_project(db: Session, project_id: int, user_id: int) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == user_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return project


def _proposal_total(proposal: Proposal) -> Decimal:
    total = Decimal("0")
    for item in proposal.items:
        if item.preco_total:
            total += item.preco_total
    return total


def _to_response(proposal: Proposal) -> ProposalResponse:
    return ProposalResponse(
        **{k: v for k, v in proposal.__dict__.items() if not k.startswith("_")},
        valor_total=_proposal_total(proposal),
    )


@router.get("/project/{project_id}", response_model=list[ProposalResponse])
def list_proposals(
    project_id: int,
    revision_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project(db, project_id, current_user.id)
    q = db.query(Proposal).filter(Proposal.project_id == project_id)
    if revision_id is not None:
        q = q.filter(Proposal.revision_id == revision_id)
    proposals = q.order_by(Proposal.created_at.asc()).all()
    return [_to_response(p) for p in proposals]


@router.post("/project/{project_id}", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
def create_proposal(
    project_id: int,
    data: ProposalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project(db, project_id, current_user.id)

    # Limita a 10 propostas por revisão
    count_q = db.query(Proposal).filter(Proposal.project_id == project_id)
    if data.revision_id is not None:
        count_q = count_q.filter(Proposal.revision_id == data.revision_id)
    if count_q.count() >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limite de 10 propostas por revisão atingido",
        )

    proposal = Proposal(**data.model_dump(), project_id=project_id, user_id=current_user.id)
    db.add(proposal)
    db.flush()

    # Inicializa ProposalItem para cada item da PQ da mesma revisão (preços zerados)
    pq_q = db.query(PQItem).filter(PQItem.project_id == project_id)
    if data.revision_id is not None:
        pq_q = pq_q.filter(PQItem.revision_id == data.revision_id)
    pq_items = pq_q.all()
    for pq_item in pq_items:
        db.add(ProposalItem(proposal_id=proposal.id, pq_item_id=pq_item.id))

    db.commit()
    db.refresh(proposal)
    return _to_response(proposal)


@router.get("/{proposal_id}", response_model=ProposalResponse)
def get_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)
    return _to_response(proposal)


@router.get("/{proposal_id}/items", response_model=ProposalWithItems)
def get_proposal_with_items(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna proposta com todos os itens e preços para o editor."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)

    # Garante que existem ProposalItems para todos os itens da PQ
    existing_ids = {pi.pq_item_id for pi in proposal.items}
    pq_items = db.query(PQItem).filter(PQItem.project_id == proposal.project_id).all()
    for pq_item in pq_items:
        if pq_item.id not in existing_ids:
            db.add(ProposalItem(proposal_id=proposal.id, pq_item_id=pq_item.id))
    db.commit()
    db.refresh(proposal)

    return ProposalWithItems(
        **{k: v for k, v in proposal.__dict__.items() if not k.startswith("_")},
        valor_total=_proposal_total(proposal),
        items=proposal.items,
    )


@router.put("/{proposal_id}", response_model=ProposalResponse)
def update_proposal(
    proposal_id: int,
    data: ProposalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(proposal, field, value)
    db.commit()
    db.refresh(proposal)
    return _to_response(proposal)


@router.put("/{proposal_id}/items", response_model=ProposalWithItems)
def bulk_update_items(
    proposal_id: int,
    data: ProposalItemsBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Salva os preços de todos os itens de uma proposta de uma vez."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)

    # Monta dicionário id→PQItem para calcular totais
    pq_map = {
        pi.id: pi
        for pi in db.query(PQItem).filter(PQItem.project_id == proposal.project_id).all()
    }

    for item_data in data.items:
        pi = (
            db.query(ProposalItem)
            .filter(
                ProposalItem.proposal_id == proposal_id,
                ProposalItem.pq_item_id == item_data.pq_item_id,
            )
            .first()
        )
        if not pi:
            pi = ProposalItem(proposal_id=proposal_id, pq_item_id=item_data.pq_item_id)
            db.add(pi)

        pi.preco_unitario = item_data.preco_unitario
        pi.bdi = item_data.bdi

        # Calcula total
        if item_data.preco_unitario and item_data.pq_item_id in pq_map:
            pq_item = pq_map[item_data.pq_item_id]
            bdi_rate = float(item_data.bdi if item_data.bdi is not None else proposal.bdi_global or 0)
            pi.preco_total = Decimal(str(
                float(pq_item.quantidade) * float(item_data.preco_unitario) * (1 + bdi_rate / 100)
            ))
        else:
            pi.preco_total = None

    db.commit()
    db.refresh(proposal)
    return ProposalWithItems(
        **{k: v for k, v in proposal.__dict__.items() if not k.startswith("_")},
        valor_total=_proposal_total(proposal),
        items=proposal.items,
    )


@router.get("/{proposal_id}/template")
def download_proposal_template(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Baixa o modelo Excel da proposta com os itens da PQ e colunas de preço em branco."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)

    pq_items = (
        db.query(PQItem)
        .filter(PQItem.project_id == proposal.project_id)
        .order_by(PQItem.ordem, PQItem.numero_item)
        .all()
    )
    project = db.query(Project).filter(Project.id == proposal.project_id).first()
    buf = gerar_modelo_proposta(
        project_name=project.nome,
        pq_items=pq_items,
        empresa=proposal.empresa,
        bdi_global=float(proposal.bdi_global or 0),
        proposal_items=None,
    )
    filename = f"proposta_{proposal_id}_template.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{proposal_id}/export")
def export_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta a proposta preenchida com preços."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)

    pq_items = (
        db.query(PQItem)
        .filter(PQItem.project_id == proposal.project_id)
        .order_by(PQItem.ordem, PQItem.numero_item)
        .all()
    )
    project = db.query(Project).filter(Project.id == proposal.project_id).first()
    buf = gerar_modelo_proposta(
        project_name=project.nome,
        pq_items=pq_items,
        empresa=proposal.empresa,
        bdi_global=float(proposal.bdi_global or 0),
        proposal_items=proposal.items,
    )
    filename = f"proposta_{proposal_id}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{proposal_id}/import", response_model=ProposalWithItems)
async def import_proposal(
    proposal_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Importa preços de uma proposta a partir de Excel preenchido."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)

    pq_items = (
        db.query(PQItem)
        .filter(PQItem.project_id == proposal.project_id)
        .order_by(PQItem.ordem, PQItem.numero_item)
        .all()
    )

    file_bytes = await file.read()
    try:
        rows = importar_proposta_excel(file_bytes, pq_items)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    pq_map = {pi.id: pi for pi in pq_items}

    for row in rows:
        pi = (
            db.query(ProposalItem)
            .filter(
                ProposalItem.proposal_id == proposal_id,
                ProposalItem.pq_item_id == row["pq_item_id"],
            )
            .first()
        )
        if not pi:
            pi = ProposalItem(proposal_id=proposal_id, pq_item_id=row["pq_item_id"])
            db.add(pi)

        pi.preco_unitario = row["preco_unitario"]
        pi.bdi = row["bdi"]
        # Scope capture: only set if values differ from PQ
        if row.get("descricao_proposta"):
            pi.descricao_proposta = row["descricao_proposta"]
        if row.get("unidade_proposta"):
            pi.unidade_proposta = row["unidade_proposta"]
        if row.get("quantidade_proposta") is not None:
            pi.quantidade_proposta = row["quantidade_proposta"]

        if pi.preco_unitario and row["pq_item_id"] in pq_map:
            pq_item = pq_map[row["pq_item_id"]]
            bdi_rate = float(pi.bdi if pi.bdi is not None else proposal.bdi_global or 0)
            pi.preco_total = Decimal(str(
                float(pq_item.quantidade) * float(pi.preco_unitario) * (1 + bdi_rate / 100)
            ))
        else:
            pi.preco_total = None

    db.commit()
    db.refresh(proposal)
    return ProposalWithItems(
        **{k: v for k, v in proposal.__dict__.items() if not k.startswith("_")},
        valor_total=_proposal_total(proposal),
        items=proposal.items,
    )


@router.patch("/{proposal_id}/unset-winner", response_model=ProposalResponse)
def unset_winner(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.proposal import ProposalStatus
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)
    proposal.is_winner = False
    proposal.status = ProposalStatus.EM_ANALISE
    db.commit()
    db.refresh(proposal)
    return _to_response(proposal)


@router.delete("/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)
    db.delete(proposal)
    db.commit()
