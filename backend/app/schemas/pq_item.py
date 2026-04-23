from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel


class PQItemCreate(BaseModel):
    numero_item: str
    localidade: Optional[str] = None
    disciplina: Optional[str] = None
    categoria: Optional[str] = None
    codigo: Optional[str] = None
    descricao: str
    unidade: str
    quantidade: Decimal
    referencia_codigo: Optional[str] = None
    preco_referencia: Optional[Decimal] = None
    observacao: Optional[str] = None
    ordem: int = 0


class PQItemUpdate(BaseModel):
    numero_item: Optional[str] = None
    localidade: Optional[str] = None
    disciplina: Optional[str] = None
    categoria: Optional[str] = None
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    unidade: Optional[str] = None
    quantidade: Optional[Decimal] = None
    referencia_codigo: Optional[str] = None
    preco_referencia: Optional[Decimal] = None
    observacao: Optional[str] = None
    ordem: Optional[int] = None


class PQItemResponse(BaseModel):
    id: int
    project_id: int
    numero_item: str
    localidade: Optional[str] = None
    disciplina: Optional[str] = None
    categoria: Optional[str] = None
    codigo: Optional[str] = None
    descricao: str
    unidade: str
    quantidade: Decimal
    referencia_codigo: Optional[str] = None
    preco_referencia: Optional[Decimal] = None
    observacao: Optional[str] = None
    ordem: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PQItemBulkSave(BaseModel):
    """Salva todos os itens da PQ de uma vez (upsert), escopado por revisão."""
    revision_id: Optional[int] = None
    items: List[PQItemCreate]
