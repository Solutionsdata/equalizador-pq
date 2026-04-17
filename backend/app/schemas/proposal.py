from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from app.models.proposal import ProposalStatus


class ProposalCreate(BaseModel):
    empresa: str
    cnpj: Optional[str] = None
    contato: Optional[str] = None
    email_contato: Optional[str] = None
    telefone: Optional[str] = None
    bdi_global: Decimal = Decimal("0")
    observacao: Optional[str] = None
    revision_id: Optional[int] = None


class ProposalUpdate(BaseModel):
    empresa: Optional[str] = None
    cnpj: Optional[str] = None
    contato: Optional[str] = None
    email_contato: Optional[str] = None
    telefone: Optional[str] = None
    bdi_global: Optional[Decimal] = None
    status: Optional[ProposalStatus] = None
    is_winner: Optional[bool] = None
    observacao: Optional[str] = None


class ProposalItemData(BaseModel):
    pq_item_id: int
    preco_unitario: Optional[Decimal] = None
    bdi: Optional[Decimal] = None


class ProposalItemResponse(BaseModel):
    id: int
    pq_item_id: int
    preco_unitario: Optional[Decimal] = None
    bdi: Optional[Decimal] = None
    preco_total: Optional[Decimal] = None

    model_config = {"from_attributes": True}


class ProposalResponse(BaseModel):
    id: int
    project_id: int
    revision_id: Optional[int] = None
    empresa: str
    cnpj: Optional[str] = None
    contato: Optional[str] = None
    email_contato: Optional[str] = None
    telefone: Optional[str] = None
    bdi_global: Decimal
    data_recebimento: datetime
    status: ProposalStatus
    is_winner: bool
    observacao: Optional[str] = None
    created_at: datetime
    valor_total: Optional[Decimal] = None

    model_config = {"from_attributes": True}


class ProposalWithItems(ProposalResponse):
    items: List[ProposalItemResponse] = []


class ProposalItemsBulkUpdate(BaseModel):
    items: List[ProposalItemData]
