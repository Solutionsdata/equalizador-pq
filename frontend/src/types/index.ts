// ── Enums ────────────────────────────────────────────────────────────────────
export type WorkType = string
export type ProjectStatus = 'RASCUNHO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'ARQUIVADO'

export const TIPO_OBRA_OPTIONS = ['Duplicação', 'Edificação', 'OAE', 'Outra']
export type ProposalStatus = 'RECEBIDA' | 'EM_ANALISE' | 'VENCEDORA' | 'PERDEDORA' | 'DESCLASSIFICADA'
export type ABCClass = 'A' | 'B' | 'C'

// ── Entidades ────────────────────────────────────────────────────────────────
export interface User {
  id: number
  nome: string
  email: string
  empresa?: string
  cargo?: string
  is_active: boolean
  is_admin: boolean
  assinatura_ate?: string | null
  created_at: string
}

export interface Project {
  id: number
  user_id: number
  nome: string
  descricao?: string
  numero_licitacao?: string
  tipo_obra: WorkType
  extensao_km?: number | null
  status: ProjectStatus
  created_at: string
  updated_at: string
  total_pq_items: number
  total_proposals: number
}

// ── Baseline ─────────────────────────────────────────────────────────────────
export interface BaselineItem {
  pq_item_id: number
  numero_item: string
  descricao: string
  unidade: string
  quantidade: number
  categoria?: string
  disciplina?: string
  preco_unitario?: number | null
  preco_total: number
}

export interface BaselineEntry {
  project_id: number
  project_nome: string
  project_status?: string
  project_created_at?: string
  numero_licitacao?: string
  tipo_obra: WorkType
  extensao_km?: number | null
  proposal_id: number
  empresa: string
  cnpj?: string
  bdi_global: number
  valor_total: number
  valor_referencia_pq?: number | null
  valor_primeira_proposta?: number | null
  sla_dias?: number | null
  data_premiacao: string
  revision_history?: Array<{ numero: number; valor: number }>
  media_propostas?: number | null
  items: BaselineItem[]
}

/** Planilha de Quantitativos — 12 colunas de negócio */
export interface PQItem {
  id: number
  project_id: number
  numero_item: string
  localidade?: string
  disciplina?: string
  categoria?: string
  codigo?: string
  descricao: string
  unidade: string
  quantidade: number
  referencia_codigo?: string
  preco_referencia?: number
  observacao?: string
  ordem: number
  created_at: string
}

export interface Proposal {
  id: number
  project_id: number
  revision_id?: number | null
  empresa: string
  cnpj?: string
  contato?: string
  email_contato?: string
  telefone?: string
  bdi_global: number
  data_recebimento: string
  status: ProposalStatus
  is_winner: boolean
  observacao?: string
  created_at: string
  valor_total?: number
}

export interface ProposalItem {
  id: number
  pq_item_id: number
  preco_unitario?: number        // CUD sem REIDI
  bdi?: number                   // BDI sem REIDI
  custo_unit_com_reidi?: number  // CUD com REIDI
  bdi_com_reidi?: number         // BDI com REIDI
  preco_total?: number           // Total COM REIDI (analytics)
}

export interface ProposalWithItems extends Proposal {
  items: ProposalItem[]
}

// ── Analytics ────────────────────────────────────────────────────────────────
export interface ABCItem {
  pq_item_id: number
  numero_item: string
  descricao: string
  unidade: string
  quantidade: number
  categoria?: string
  disciplina?: string
  localidade?: string
  preco_medio: number
  valor_total: number
  percentual: number
  percentual_acumulado: number
  classe: ABCClass
  posicao: number
}

export interface ParetoData {
  items: ABCItem[]
  total_valor: number
  count_a: number
  count_b: number
  count_c: number
  valor_a: number
  valor_b: number
  valor_c: number
}

export interface ProposalComparisonItem {
  pq_item_id: number
  numero_item: string
  descricao: string
  unidade: string
  quantidade: number
  categoria?: string
  disciplina?: string
  localidade?: string
  preco_referencia?: number
  valor_referencia?: number
  precos: Record<string, number | null>
  totais: Record<string, number | null>
  preco_medio?: number
  preco_minimo?: number
  preco_maximo?: number
  desvio_padrao?: number
}

export interface EqualizationProposal {
  id: number
  empresa: string
  status: ProposalStatus
  is_winner: boolean
  bdi_global: number
  valor_total: number
}

export interface EqualizationResponse {
  project_id: number
  proposals: EqualizationProposal[]
  items: ProposalComparisonItem[]
}

export interface DisciplineSummary {
  disciplina: string
  valor_total: number
  percentual: number
  count_items: number
}

export interface CategoriaSummary {
  categoria: string
  valor_total: number
  percentual: number
  count_items: number
}

export interface LocalidadeSummary {
  localidade: string
  valor_total: number
  percentual: number
  count_items: number
}

// ── Revision System ──────────────────────────────────────────────────────────
export interface ProjectRevision {
  id: number
  project_id: number
  numero: number
  descricao?: string
  created_at: string
}

export interface ScopeChange {
  numero_item: string
  descricao_pq: string
  descricao_proposta?: string
  unidade_pq: string
  unidade_proposta?: string
  quantidade_pq: number
  quantidade_proposta?: number
  changed_fields: string[]
}

export interface ScopeValidationProposal {
  id: number
  empresa: string
  has_changes: boolean
  changes: ScopeChange[]
}

export interface ScopeValidationResponse {
  revision_id: number
  revision_numero: number
  proposals: ScopeValidationProposal[]
  any_changes: boolean
}

export interface RevisionCompareItem {
  numero_item: string
  descricao: string
  status: 'unchanged' | 'added' | 'removed' | 'changed'
  valor_a?: number
  valor_b?: number
  delta?: number
  delta_pct?: number
  pq_change?: { field: string; valor_a: any; valor_b: any }[]
}

export interface RevisionCompareResponse {
  rev_a: number
  rev_b: number
  global: { total_a: number; total_b: number; delta: number; delta_pct: number }
  by_discipline: { disciplina: string; total_a: number; total_b: number; delta: number; delta_pct: number }[]
  by_category: { categoria: string; total_a: number; total_b: number; delta: number; delta_pct: number }[]
  by_item: RevisionCompareItem[]
  pq_changes: RevisionCompareItem[]
}

// ── Utilitários ──────────────────────────────────────────────────────────────
export const CATEGORIAS = [
  'Terraplenagem', 'Pavimentação', 'Drenagem',
  'Obras de Arte Correntes', 'Obras de Arte Especiais',
  'Sinalização', 'Urbanização', 'Edificações',
  'Sistemas Elétricos', 'Meio Ambiente', 'Outros',
]

export const DISCIPLINAS = [
  'Civil', 'Elétrica', 'Mecânica', 'Hidrossanitária',
  'Geotécnica', 'Estrutural', 'Arquitetura', 'Ambiental', 'Outros',
]

export const UNIDADES = [
  'm', 'm²', 'm³', 'km', 'un', 'vb', 'kg', 't',
  'l', 'mês', 'h', 'dia',
]

export const TIPO_OBRA_LABELS: Record<string, string> = {
  INFRAESTRUTURA: 'Infraestrutura',
  EDIFICACAO: 'Edificação',
  OBRA_DE_ARTE: 'Obra de Arte Especial',
  'Duplicação': 'Duplicação',
  'Edificação': 'Edificação',
  'OAE': 'OAE',
}

export function getTipoObraLabel(tipo: string): string {
  return TIPO_OBRA_LABELS[tipo] ?? tipo
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  RASCUNHO: 'Rascunho',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  ARQUIVADO: 'Arquivado',
}

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  RECEBIDA: 'Recebida',
  EM_ANALISE: 'Em Análise',
  VENCEDORA: 'Vencedora',
  PERDEDORA: 'Perdedora',
  DESCLASSIFICADA: 'Desclassificada',
}

export const formatBRL = (value: number | null | undefined): string => {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export const formatNumber = (value: number | null | undefined, decimals = 2): string => {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export const formatPercent = (value: number | null | undefined): string => {
  if (value == null) return '—'
  return `${value.toFixed(2)}%`
}
