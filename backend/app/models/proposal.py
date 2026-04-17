import enum
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.database import Base



class ProposalStatus(str, enum.Enum):
    RECEBIDA = "RECEBIDA"
    EM_ANALISE = "EM_ANALISE"
    VENCEDORA = "VENCEDORA"
    PERDEDORA = "PERDEDORA"
    DESCLASSIFICADA = "DESCLASSIFICADA"


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    revision_id      = Column(Integer, ForeignKey("project_revisions.id", ondelete="SET NULL"), nullable=True)
    empresa          = Column(String(300), nullable=False)   # Razão social do proponente
    cnpj             = Column(String(20))                    # CNPJ formatado
    contato          = Column(String(200))                   # Nome do contato
    email_contato    = Column(String(200))                   # E-mail do contato
    telefone         = Column(String(30))                    # Telefone
    bdi_global       = Column(Numeric(5, 2), default=0)      # BDI global da proposta (%)
    data_recebimento = Column(DateTime, default=datetime.utcnow)
    status           = Column(Enum(ProposalStatus), default=ProposalStatus.RECEBIDA, nullable=False)
    is_winner        = Column(Boolean, default=False)         # Proposta vencedora (histórico)
    observacao       = Column(Text)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="proposals")
    user    = relationship("User", back_populates="proposals")
    items   = relationship("ProposalItem", back_populates="proposal", cascade="all, delete-orphan")
