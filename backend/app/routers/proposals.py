from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectStatus
from app.models.project_share import ProjectShare
from app.models.pq_item import PQItem
from app.models.proposal import Proposal
from app.models.proposal_item import ProposalItem
from app.schemas.proposal import (
    ProposalCreate, ProposalUpdate, ProposalResponse,
    ProposalWithItems, ProposalItemsBulkUpdate,
)
from app.services.excel import gerar_proposta_csv

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

    # PQ items scoped to the same revision as the proposal
    pq_items = (
        db.query(PQItem)
        .filter(
            PQItem.project_id == proposal.project_id,
            PQItem.revision_id == proposal.revision_id,
        )
        .all()
    )
    valid_pq_ids = {item.id for item in pq_items}

    # Remove ProposalItems that belong to a different revision (cleanup contamination)
    for pi in list(proposal.items):
        if pi.pq_item_id not in valid_pq_ids:
            db.delete(pi)
    db.flush()

    # Add missing ProposalItems for this revision
    existing_ids = {pi.pq_item_id for pi in proposal.items if pi.pq_item_id in valid_pq_ids}
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
    # Auto-complete project when a winner is selected
    if data.is_winner is True:
        project = db.query(Project).filter(Project.id == proposal.project_id).first()
        if project and project.status != ProjectStatus.CONCLUIDO:
            project.status = ProjectStatus.CONCLUIDO
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

    # Monta dicionário id→PQItem para calcular totais (escopo da revisão da proposta)
    pq_map = {
        pi.id: pi
        for pi in db.query(PQItem).filter(
            PQItem.project_id == proposal.project_id,
            PQItem.revision_id == proposal.revision_id,
        ).all()
    }

    # Pre-load all existing ProposalItems in one query instead of 1 query per item
    existing_items = {
        pi.pq_item_id: pi
        for pi in db.query(ProposalItem).filter(ProposalItem.proposal_id == proposal_id).all()
    }

    for item_data in data.items:
        pi = existing_items.get(item_data.pq_item_id)
        if not pi:
            pi = ProposalItem(proposal_id=proposal_id, pq_item_id=item_data.pq_item_id)
            db.add(pi)

        pi.preco_unitario = item_data.preco_unitario
        pi.bdi = item_data.bdi
        pi.custo_unit_com_reidi = item_data.custo_unit_com_reidi
        pi.bdi_com_reidi = item_data.bdi_com_reidi

        # Calcula total COM REIDI para analytics; fallback p/ sem REIDI se com não informado
        com_price = item_data.custo_unit_com_reidi or item_data.preco_unitario
        com_bdi   = item_data.bdi_com_reidi if item_data.custo_unit_com_reidi else item_data.bdi
        if com_price and item_data.pq_item_id in pq_map:
            pq_item = pq_map[item_data.pq_item_id]
            # Individual BDI stored as fraction (0.43 = 43%); global BDI stored as percentage (43 = 43%)
            if com_bdi is not None:
                bdi_factor = 1 + float(com_bdi)
            else:
                bdi_factor = 1 + float(proposal.bdi_global or 0) / 100
            pi.preco_total = Decimal(str(
                float(pq_item.quantidade) * float(com_price) * bdi_factor
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
    """Baixa o modelo CSV da proposta com os itens da PQ e colunas de preço em branco."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)

    pq_items = (
        db.query(PQItem)
        .filter(
            PQItem.project_id == proposal.project_id,
            PQItem.revision_id == proposal.revision_id,
        )
        .order_by(PQItem.ordem, PQItem.numero_item)
        .all()
    )
    project = db.query(Project).filter(Project.id == proposal.project_id).first()
    buf = gerar_proposta_csv(
        project_name=project.nome,
        pq_items=pq_items,
        empresa=proposal.empresa,
        bdi_global=float(proposal.bdi_global or 0),
        proposal_items=None,
    )
    filename = f"proposta_{proposal_id}_template.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{proposal_id}/export")
def export_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta a proposta preenchida com preços em CSV."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    _check_project(db, proposal.project_id, current_user.id)

    pq_items = (
        db.query(PQItem)
        .filter(
            PQItem.project_id == proposal.project_id,
            PQItem.revision_id == proposal.revision_id,
        )
        .order_by(PQItem.ordem, PQItem.numero_item)
        .all()
    )
    project = db.query(Project).filter(Project.id == proposal.project_id).first()
    buf = gerar_proposta_csv(
        project_name=project.nome,
        pq_items=pq_items,
        empresa=proposal.empresa,
        bdi_global=float(proposal.bdi_global or 0),
        proposal_items=proposal.items,
    )
    filename = f"proposta_{proposal_id}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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
