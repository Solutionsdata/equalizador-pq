from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.project import WorkType, ProjectStatus


class ProjectCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    numero_licitacao: Optional[str] = None
    tipo_obra: WorkType = WorkType.INFRAESTRUTURA


class ProjectUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    numero_licitacao: Optional[str] = None
    tipo_obra: Optional[WorkType] = None
    status: Optional[ProjectStatus] = None


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    nome: str
    descricao: Optional[str] = None
    numero_licitacao: Optional[str] = None
    tipo_obra: WorkType
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    total_pq_items: int = 0
    total_proposals: int = 0

    model_config = {"from_attributes": True}
