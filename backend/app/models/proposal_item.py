from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from app.database import Base


class ProposalItem(Base):
    """Preços ofertados por um proponente para cada item da PQ."""
    __tablename__ = "proposal_items"

    id            = Column(Integer, primary_key=True, index=True)
    proposal_id   = Column(Integer, ForeignKey("proposals.id"), nullable=False)
    pq_item_id    = Column(Integer, ForeignKey("pq_items.id"), nullable=False)

    preco_unitario = Column(Numeric(18, 4))   # Preço unitário ofertado
    bdi            = Column(Numeric(5, 2))    # BDI % (sobrescreve o global da proposta)
    preco_total    = Column(Numeric(18, 4))   # Calculado: qtd × PU × (1 + BDI/100)

    # Escopo capturado do proponente (pode diferir da PQ)
    descricao_proposta  = Column(String(500), nullable=True)
    unidade_proposta    = Column(String(20),  nullable=True)
    quantidade_proposta = Column(Numeric(18, 4), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    proposal = relationship("Proposal", back_populates="items")
    pq_item  = relationship("PQItem", back_populates="proposal_items")
