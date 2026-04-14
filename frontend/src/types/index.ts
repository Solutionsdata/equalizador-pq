// ── Enums ────────────────────────────────────────────────────────────────────
export type WorkType = 'INFRAESTRUTURA' | 'EDIFICACAO' | 'OBRA_DE_ARTE'
export type ProjectStatus = 'RASCUNHO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'ARQUIVADO'
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
  status: ProjectStatus
  created_at: string
  updated_at: string
  total_pq_items: number
  total_proposals: number
}

/** Planilha de Quantitativos — 10 colunas de negócio */
export interface PQItem {
  id: number
  project_id: number
  // as 10 colunas:
  numero_item: string
  codigo?: string
  descricao: string
  unidade: string
  quantidade: number
  categoria?: string
  disciplina?: string
  referencia_codigo?: string
  preco_referencia?: number
  observacao?: string
  // internos:
  ordem: number
  created_at: string
}

export interface Proposal {
  id: number
  project_id: number
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
  preco_unitario?: number
  bdi?: number
  preco_total?: number
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

export const TIPO_OBRA_LABELS: Record<WorkType, string> = {
  INFRAESTRUTURA: 'Infraestrutura',
  EDIFICACAO: 'Edificação',
  OBRA_DE_ARTE: 'Obra de Arte Especial',
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
