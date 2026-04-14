from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class PQItem(Base):
    """
    Planilha de Quantitativos — template base do projeto.
    Exatamente 10 colunas de negócio visíveis na interface.
    """
    __tablename__ = "pq_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # ── 10 COLUNAS DA PLANILHA PQ ──────────────────────────────────────────
    numero_item      = Column(String(20),   nullable=False)   # 1 | 1.1 | 1.1.1
    codigo           = Column(String(50))                      # SINAPI / SICRO / interno
    descricao        = Column(String(500),  nullable=False)    # Descrição completa do item
    unidade          = Column(String(20),   nullable=False)    # m | m² | m³ | un | kg | t
    quantidade       = Column(Numeric(18, 4), nullable=False)  # Quantidade contratada
    categoria        = Column(String(100))                     # Terraplenagem | Pavimentação…
    disciplina       = Column(String(100))                     # Civil | Elétrica | Mecânica…
    referencia_codigo= Column(String(50))                      # Código de referência externo
    preco_referencia = Column(Numeric(18, 4))                  # Preço unitário de referência
    observacao       = Column(Text)                            # Observações / restrições
    # ───────────────────────────────────────────────────────────────────────

    ordem = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="pq_items")
    proposal_items = relationship("ProposalItem", back_populates="pq_item", cascade="all, delete-orphan")
