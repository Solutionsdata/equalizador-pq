from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    numero_licitacao: Optional[str] = None
    tipo_obra: str = "INFRAESTRUTURA"
    extensao_km: Optional[Decimal] = None
    spe_unidade: Optional[str] = None


class ProjectUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    numero_licitacao: Optional[str] = None
    tipo_obra: Optional[str] = None
    extensao_km: Optional[Decimal] = None
    spe_unidade: Optional[str] = None
    status: Optional[ProjectStatus] = None


class SharedUserBrief(BaseModel):
    id: int
    nome: str
    email: str
    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    nome: str
    descricao: Optional[str] = None
    numero_licitacao: Optional[str] = None
    tipo_obra: str
    extensao_km: Optional[Decimal] = None
    spe_unidade: Optional[str] = None
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    total_pq_items: int = 0
    total_proposals: int = 0
    is_shared: bool = False
    owner_nome: Optional[str] = None
    shared_with: List[SharedUserBrief] = []

    model_config = {"from_attributes": True}
