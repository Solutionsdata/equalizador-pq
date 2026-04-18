import enum
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class WorkType(str, enum.Enum):
    INFRAESTRUTURA = "INFRAESTRUTURA"
    EDIFICACAO = "EDIFICACAO"
    OBRA_DE_ARTE = "OBRA_DE_ARTE"


class ProjectStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    EM_ANDAMENTO = "EM_ANDAMENTO"
    CONCLUIDO = "CONCLUIDO"
    ARQUIVADO = "ARQUIVADO"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nome = Column(String(300), nullable=False)
    descricao = Column(Text)
    numero_licitacao = Column(String(100))
    tipo_obra = Column(Enum(WorkType), default=WorkType.INFRAESTRUTURA, nullable=False)
    extensao_km = Column(Numeric(10, 3), nullable=True)   # extensão em km (obrigatório p/ duplicações)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.RASCUNHO, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    pq_items = relationship("PQItem", back_populates="project", cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="project", cascade="all, delete-orphan")
    revisions = relationship("ProjectRevision", back_populates="project", cascade="all, delete-orphan", order_by="ProjectRevision.numero")
