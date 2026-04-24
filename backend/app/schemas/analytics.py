from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel


class ABCItem(BaseModel):
    pq_item_id: int
    numero_item: str
    descricao: str
    unidade: str
    quantidade: Decimal
    categoria: Optional[str] = None
    disciplina: Optional[str] = None
    localidade: Optional[str] = None
    preco_medio: Decimal
    valor_total: Decimal
    percentual: float
    percentual_acumulado: float
    classe: str   # "A" | "B" | "C"
    posicao: int


class ParetoData(BaseModel):
    items: List[ABCItem]
    total_valor: Decimal
    count_a: int
    count_b: int
    count_c: int
    valor_a: Decimal
    valor_b: Decimal
    valor_c: Decimal


class ProposalComparisonItem(BaseModel):
    pq_item_id: int
    numero_item: str
    descricao: str
    unidade: str
    quantidade: Decimal
    categoria: Optional[str] = None
    disciplina: Optional[str] = None
    localidade: Optional[str] = None
    preco_referencia: Optional[Decimal] = None
    valor_referencia: Optional[Decimal] = None
    # chave = str(proposal_id)
    precos: Dict[str, Optional[float]]
    totais: Dict[str, Optional[float]]
    preco_medio: Optional[Decimal] = None
    preco_minimo: Optional[Decimal] = None
    preco_maximo: Optional[Decimal] = None
    desvio_padrao: Optional[float] = None


class EqualizationProposal(BaseModel):
    id: int
    empresa: str
    status: str
    is_winner: bool
    bdi_global: float
    valor_total: float


class EqualizationResponse(BaseModel):
    project_id: int
    proposals: List[EqualizationProposal]
    items: List[ProposalComparisonItem]


class DisciplineSummary(BaseModel):
    disciplina: str
    valor_total: Decimal
    percentual: float
    count_items: int


class CategoriaSummary(BaseModel):
    categoria: str
    valor_total: Decimal
    percentual: float
    count_items: int


class LocalidadeSummary(BaseModel):
    localidade: str
    valor_total: Decimal
    percentual: float
    count_items: int
