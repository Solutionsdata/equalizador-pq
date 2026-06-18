import base64
from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status, UploadFile, File
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt as jose_jwt
from pydantic import BaseModel
from sqlalchemy import delete as sa_delete, insert as sa_insert, select as sa_select
from sqlalchemy.orm import Session
from typing import Optional
from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.pq_item import PQItem
from app.models.proposal_item import ProposalItem
from app.models.project_share import ProjectShare
from app.schemas.pq_item import PQItemCreate, PQItemUpdate, PQItemResponse, PQItemBulkSave
from app.services.excel import gerar_pq_csv, parse_pq_csv

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
    return q.order_by(PQItem.ordem, PQItem.id).all()


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
    """Baixa o modelo CSV vazio da PQ."""
    project = _check_project(db, project_id, current_user.id)
    buf = gerar_pq_csv(project.nome, pq_items=None)
    filename = f"modelo_pq_{project_id}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/project/{project_id}/export")
def export_pq(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exporta a PQ atual como CSV."""
    project = _check_project(db, project_id, current_user.id)
    items = (
        db.query(PQItem)
        .filter(PQItem.project_id == project_id)
        .order_by(PQItem.ordem, PQItem.numero_item)
        .all()
    )
    buf = gerar_pq_csv(project.nome, pq_items=items)
    filename = f"pq_{project_id}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv; charset=utf-8",
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

    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel (.xlsx).")
    if filename.endswith(".xls"):
        raise HTTPException(
            status_code=400,
            detail="Formato .xls não suportado. Salve o arquivo como .xlsx no Excel e importe novamente.",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="O arquivo enviado está vazio.")

    try:
        rows = importar_pq_excel(file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Não foi possível ler o arquivo Excel. Verifique se ele não está corrompido ou protegido por senha. Detalhe: {exc}",
        )

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


class ImportB64Payload(BaseModel):
    filename: str
    content_b64: str  # base64-encoded xlsx bytes


class ImportJsonPayload(BaseModel):
    items: list[dict]  # rows already parsed by the browser


@router.post("/project/{project_id}/import-b64")
def import_pq_b64(
    project_id: int,
    payload: ImportB64Payload,
    revision_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Importa PQ recebendo o arquivo Excel codificado em base64 (JSON body).
    Otimizado para grandes volumes: DELETE + INSERT em bulk (1 query cada).
    Retorna apenas o total de itens importados; o frontend recarrega via GET.
    """
    _check_project(db, project_id, current_user.id)

    filename = payload.filename.lower()
    if not filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Envie um arquivo Excel (.xlsx).")

    try:
        file_bytes = base64.b64decode(payload.content_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Conteúdo base64 inválido.")

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="O arquivo enviado está vazio.")

    try:
        rows = importar_pq_excel(file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Não foi possível ler o arquivo Excel. Verifique se não está corrompido. Detalhe: {exc}",
        )

    # Bulk DELETE — 1 query; FK ON DELETE CASCADE cuida das proposal_items
    del_stmt = sa_delete(PQItem).where(PQItem.project_id == project_id)
    if revision_id is not None:
        del_stmt = del_stmt.where(PQItem.revision_id == revision_id)
    db.execute(del_stmt)

    # Bulk INSERT — 1 query com todos os registros (muito mais rápido que ORM loop)
    if rows:
        records = [
            {**row, "project_id": project_id, "revision_id": revision_id}
            for row in rows
        ]
        db.execute(sa_insert(PQItem), records)

    db.commit()
    return {"imported": len(rows)}


@router.post("/project/{project_id}/import-json")
def import_pq_json(
    project_id: int,
    payload: ImportJsonPayload,
    revision_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Importa PQ recebendo linhas já parseadas pelo browser (JSON puro, sem upload de arquivo)."""
    _check_project(db, project_id, current_user.id)

    ALLOWED_FIELDS = {
        "numero_item", "localidade", "disciplina", "categoria", "codigo",
        "descricao", "unidade", "quantidade", "referencia_codigo",
        "preco_referencia", "observacao", "ordem",
    }

    # Valida e higieniza cada linha
    rows = []
    for i, raw in enumerate(payload.items):
        num = str(raw.get("numero_item") or "").strip()
        desc = str(raw.get("descricao") or "").strip()
        if not num or not desc:
            continue
        clean = {k: v for k, v in raw.items() if k in ALLOWED_FIELDS}
        clean.setdefault("ordem", i)
        rows.append(clean)

    if not rows:
        raise HTTPException(status_code=400, detail="Nenhum item válido encontrado.")

    # Bulk DELETE (1 query; FK ON DELETE CASCADE cuida das proposal_items)
    del_stmt = sa_delete(PQItem).where(PQItem.project_id == project_id)
    if revision_id is not None:
        del_stmt = del_stmt.where(PQItem.revision_id == revision_id)
    db.execute(del_stmt)

    # Bulk INSERT (1 query com todos os registros)
    records = [{**row, "project_id": project_id, "revision_id": revision_id} for row in rows]
    db.execute(sa_insert(PQItem), records)
    db.commit()

    return {"imported": len(rows)}


@router.post("/project/{project_id}/import-fast")
def import_pq_fast(
    project_id: int,
    payload: ImportJsonPayload,
    revision_id: Optional[int] = Query(default=None),
    clear: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Importa PQ em lotes (chunks). clear=True no primeiro lote apaga os dados antigos;
    clear=False nos lotes seguintes apenas acrescenta. Cada lote é pequeno o suficiente
    para não ultrapassar o timeout de 30s do Render free tier."""
    _check_project(db, project_id, current_user.id)

    ALLOWED_FIELDS = {
        "numero_item", "localidade", "disciplina", "categoria", "codigo",
        "descricao", "unidade", "quantidade", "referencia_codigo",
        "preco_referencia", "observacao", "ordem",
    }

    rows = []
    for i, raw in enumerate(payload.items):
        num = str(raw.get("numero_item") or "").strip()
        desc = str(raw.get("descricao") or "").strip()
        if not num or not desc:
            continue
        clean = {k: v for k, v in raw.items() if k in ALLOWED_FIELDS}
        clean.setdefault("ordem", i)
        rows.append(clean)

    if not rows:
        raise HTTPException(status_code=400, detail="Nenhum item válido encontrado.")

    if clear:
        # Primeiro lote: apaga tudo o que existia antes
        subq = sa_select(PQItem.id).where(PQItem.project_id == project_id)
        if revision_id is not None:
            subq = subq.where(PQItem.revision_id == revision_id)
        db.execute(sa_delete(ProposalItem).where(ProposalItem.pq_item_id.in_(subq)))

        del_stmt = sa_delete(PQItem).where(PQItem.project_id == project_id)
        if revision_id is not None:
            del_stmt = del_stmt.where(PQItem.revision_id == revision_id)
        db.execute(del_stmt)

    # Insere o lote atual (1 query)
    records = [{**row, "project_id": project_id, "revision_id": revision_id} for row in rows]
    db.execute(sa_insert(PQItem), records)
    db.commit()

    return {"imported": len(rows)}


@router.post("/project/{project_id}/import-csv")
async def import_pq_csv_raw(
    project_id: int,
    request: Request,
    revision_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Importa PQ via texto CSV no corpo da requisição (Content-Type: text/plain).
    Suporta 15 000+ linhas: payload 3× menor que JSON, sem overhead de serialização.
    """
    _check_project(db, project_id, current_user.id)

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Corpo da requisição vazio.")

    try:
        text = body.decode('utf-8-sig')
        rows = parse_pq_csv(text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Erro ao ler CSV: {exc}")

    # Apaga proposal_items vinculados (subquery, 1 query)
    subq = sa_select(PQItem.id).where(PQItem.project_id == project_id)
    if revision_id is not None:
        subq = subq.where(PQItem.revision_id == revision_id)
    db.execute(sa_delete(ProposalItem).where(ProposalItem.pq_item_id.in_(subq)))

    # Apaga pq_items antigos (1 query)
    del_stmt = sa_delete(PQItem).where(PQItem.project_id == project_id)
    if revision_id is not None:
        del_stmt = del_stmt.where(PQItem.revision_id == revision_id)
    db.execute(del_stmt)

    # Insere todos de uma vez (1 query)
    records = [{**row, "project_id": project_id, "revision_id": revision_id} for row in rows]
    db.execute(sa_insert(PQItem), records)
    db.commit()

    return {"imported": len(rows)}


_ALLOWED_PQ_FIELDS = {
    "numero_item", "localidade", "disciplina", "categoria", "codigo",
    "descricao", "unidade", "quantidade", "referencia_codigo",
    "preco_referencia", "observacao", "ordem",
}


@router.websocket("/project/{project_id}/import-ws")
async def import_pq_ws(
    project_id: int,
    websocket: WebSocket,
    token: str = Query(...),
    revision_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Importa PQ via WebSocket: sem timeout de 30s do Render, sem limite de requests.
    O cliente envia lotes via { type: 'chunk', rows: [...] } e recebe ACK por lote.
    """
    await websocket.accept()

    # Autentica via token na query (WebSocket não suporta Authorization header no browser)
    try:
        payload = jose_jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError()
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise ValueError()
    except Exception:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    try:
        _check_project(db, project_id, user.id)
    except HTTPException:
        await websocket.close(code=1008, reason="Project not found")
        return

    cleared = False
    total_imported = 0

    try:
        while True:
            try:
                msg = await websocket.receive_json()
            except WebSocketDisconnect:
                return

            msg_type = msg.get("type")

            if msg_type == "chunk":
                rows = msg.get("rows", [])

                if not cleared:
                    subq = sa_select(PQItem.id).where(PQItem.project_id == project_id)
                    if revision_id is not None:
                        subq = subq.where(PQItem.revision_id == revision_id)
                    db.execute(sa_delete(ProposalItem).where(ProposalItem.pq_item_id.in_(subq)))
                    del_stmt = sa_delete(PQItem).where(PQItem.project_id == project_id)
                    if revision_id is not None:
                        del_stmt = del_stmt.where(PQItem.revision_id == revision_id)
                    db.execute(del_stmt)
                    cleared = True

                clean_rows = []
                for i, raw in enumerate(rows):
                    num = str(raw.get("numero_item") or "").strip()
                    desc = str(raw.get("descricao") or "").strip()
                    if not num and not desc:
                        continue
                    clean = {k: v for k, v in raw.items() if k in _ALLOWED_PQ_FIELDS}
                    clean['numero_item'] = num or '—'
                    clean['descricao'] = desc or '—'
                    clean.setdefault("ordem", total_imported + i)
                    clean_rows.append(clean)

                if clean_rows:
                    records = [
                        {**row, "project_id": project_id, "revision_id": revision_id}
                        for row in clean_rows
                    ]
                    db.execute(sa_insert(PQItem), records)
                    db.commit()
                    total_imported += len(clean_rows)

                await websocket.send_json({"type": "ack", "imported": total_imported})

            elif msg_type == "done":
                await websocket.send_json({"type": "complete", "total": total_imported})
                await websocket.close()
                return

    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
            await websocket.close()
        except Exception:
            pass


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
