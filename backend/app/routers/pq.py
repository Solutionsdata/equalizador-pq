from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.pq_item import PQItem
from app.models.proposal_item import ProposalItem
from app.models.project_share import ProjectShare
from app.schemas.pq_item import PQItemCreate, PQItemUpdate, PQItemResponse, PQItemBulkSave
from app.services.excel import gerar_modelo_pq, importar_pq_excel

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


@router.get("/project/{project_id}", response_model=list[PQItemResponse])
def list_pq_items(
    project_id: int,
    revision_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project(db, project_id, current_user.id)
    q = db.query(PQItem).filter(PQItem.project_id == project_id)
    if revision_id is not None:
        q = q.filter(PQItem.revision_id == revision_id)
    items = q.order_by(PQItem.id).all()

    # Deduplicate within the revision: keep the item that has proposal prices linked.
    # Multiple identical rows accumulate when PQ is imported more than once.
    item_ids = [item.id for item in items]
    items_with_prices: set[int] = set()
    if item_ids:
        rows = (
            db.query(ProposalItem.pq_item_id)
            .filter(ProposalItem.pq_item_id.in_(item_ids))
            .distinct()
            .all()
        )
        items_with_prices = {r.pq_item_id for r in rows}

    seen: dict[tuple, PQItem] = {}
    for item in items:
        key = (
            (item.numero_item or '').strip(),
            (item.localidade or '').strip(),
            (item.codigo or '').strip(),
            (item.descricao or '').strip(),
            (item.unidade or '').strip(),
            round(float(item.quantidade or 0), 4),
        )
        if key not in seen:
            seen[key] = item
        elif item.id in items_with_prices and seen[key].id not in items_with_prices:
            seen[key] = item

    return sorted(seen.values(), key=lambda x: (x.ordem, x.numero_item, x.id))


@router.post("/project/{project_id}", response_model=PQItemResponse, status_code=status.HTTP_201_CREATED)
def create_pq_item(
    project_id: int,
    data: PQItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project(db, project_id, current_user.id)
    item = PQItem(**data.model_dump(), project_id=project_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/project/{project_id}/bulk", response_model=list[PQItemResponse])
def bulk_save_pq_items(
    project_id: int,
    data: PQItemBulkSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Substitui os itens da PQ do projeto (escopado por revisão) pelos itens enviados.
    Usado pelo editor de planilha para salvar tudo de uma vez.
    """
    _check_project(db, project_id, current_user.id)

    # Remove via ORM para respeitar cascade (ProposalItems referencia PQItem)
    q = db.query(PQItem).filter(PQItem.project_id == project_id)
    if data.revision_id is not None:
        q = q.filter(PQItem.revision_id == data.revision_id)
    for old_item in q.all():
        db.delete(old_item)
    db.flush()

    # Insere novos itens com revision_id
    # model_dump() já inclui 'ordem'; excluímos para evitar TypeError de kwarg duplicado
    new_items = []
    for i, item_data in enumerate(data.items):
        item = PQItem(
            **item_data.model_dump(exclude={'ordem'}),
            project_id=project_id,
            ordem=i,
            revision_id=data.revision_id,
        )
        db.add(item)
        new_items.append(item)

    db.commit()
    for item in new_items:
        db.refresh(item)
    return new_items


@router.put("/{item_id}", response_model=PQItemResponse)
def update_pq_item(
    item_id: int,
    data: PQItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(PQItem).filter(PQItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    _check_project(db, item.project_id, current_user.id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.get("/project/{project_id}/template")
def download_pq_template(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Baixa o modelo Excel vazio da PQ (50 linhas em branco)."""
    project = _check_project(db, project_id, current_user.id)
    buf = gerar_modelo_pq(project.nome, pq_items=None)
    filename = f"modelo_pq_{project_id}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/project/{project_id}/export")
def export_pq(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta a PQ com os dados atuais."""
    project = _check_project(db, project_id, current_user.id)
    items = (
        db.query(PQItem)
        .filter(PQItem.project_id == project_id)
        .order_by(PQItem.ordem, PQItem.numero_item)
        .all()
    )
    buf = gerar_modelo_pq(project.nome, pq_items=items)
    filename = f"pq_{project_id}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/project/{project_id}/import", response_model=list[PQItemResponse])
async def import_pq(
    project_id: int,
    revision_id: Optional[int] = Query(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Importa itens da PQ a partir de um arquivo Excel (escopado por revisão)."""
    _check_project(db, project_id, current_user.id)

    file_bytes = await file.read()
    try:
        rows = importar_pq_excel(file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Remove via ORM para respeitar cascade (ProposalItems → PQItem FK)
    q = db.query(PQItem).filter(PQItem.project_id == project_id)
    if revision_id is not None:
        q = q.filter(PQItem.revision_id == revision_id)
    for old_item in q.all():
        db.delete(old_item)
    db.flush()

    new_items = []
    for row in rows:
        # 'ordem' já vem dentro de row — não passar explicitamente
        item = PQItem(**row, project_id=project_id, revision_id=revision_id)
        db.add(item)
        new_items.append(item)
    db.commit()
    for item in new_items:
        db.refresh(item)
    return new_items


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pq_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(PQItem).filter(PQItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    _check_project(db, item.project_id, current_user.id)
    db.delete(item)
    db.commit()
