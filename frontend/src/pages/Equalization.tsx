import React, { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsAPI, proposalsAPI, projectsAPI, revisionsAPI, downloadBlob } from '../services/api'
import type { EqualizationResponse, ProjectRevision } from '../types'
import { PROPOSAL_STATUS_LABELS, formatBRL, formatNumber } from '../types'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, ArrowLeft, Trophy, X, Check, Building2, FileDown, FileUp,
  Users, UserPlus, ChevronUp, ChevronDown, GitBranch,
} from 'lucide-react'
import type { Proposal } from '../types'
import RevisionSelector from '../components/RevisionSelector'

// ── Constants ─────────────────────────────────────────────────────────────────

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  RECEBIDA: 'bg-gray-100 text-gray-600',
  EM_ANALISE: 'bg-blue-100 text-blue-700',
  VENCEDORA: 'bg-green-100 text-green-700',
  PERDEDORA: 'bg-red-100 text-red-600',
  DESCLASSIFICADA: 'bg-orange-100 text-orange-600',
}

const REV_COLORS = [
  { header: 'bg-slate-700', border: 'border-slate-300', badge: 'bg-slate-600' },
  { header: 'bg-blue-700', border: 'border-blue-300', badge: 'bg-blue-600' },
  { header: 'bg-purple-700', border: 'border-purple-300', badge: 'bg-purple-600' },
  { header: 'bg-indigo-700', border: 'border-indigo-300', badge: 'bg-indigo-600' },
  { header: 'bg-emerald-700', border: 'border-emerald-300', badge: 'bg-emerald-600' },
  { header: 'bg-rose-700', border: 'border-rose-300', badge: 'bg-rose-600' },
]

function getCellColor(value: number | null, min: number | null, max: number | null): string {
  if (!value || !min || !max) return ''
  if (value === min) return 'bg-green-50 text-green-700 font-semibold'
  if (value === max) return 'bg-red-50 text-red-600'
  if (min > 0 && (value - min) / min < 0.1) return 'bg-yellow-50 text-amber-700'
  return ''
}

// ── RevisionPanel ──────────────────────────────────────────────────────────────

interface RevisionPanelProps {
  pid: number
  revision: ProjectRevision
  isLatest: boolean
  colorIndex: number
  onAddProposal: (revisionId: number) => void
  importingId: number | null
  onDownloadTemplate: (id: number, empresa: string) => void
  onTriggerImport: (id: number) => void
}

function RevisionPanel({
  pid, revision, isLatest, colorIndex,
  onAddProposal, importingId, onDownloadTemplate, onTriggerImport,
}: RevisionPanelProps) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tableExpanded, setTableExpanded] = useState(isLatest)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [disciplineFilter, setDisciplineFilter] = useState('')

  const colors = REV_COLORS[colorIndex % REV_COLORS.length]

  const { data: equalization, isLoading } = useQuery<EqualizationResponse>({
    queryKey: ['equalization', pid, revision.id],
    queryFn: () => analyticsAPI.getEqualization(pid, revision.id).then((r) => r.data),
  })

  const proposals = equalization?.proposals ?? []
  const items = equalization?.items ?? []

  const categories = [...new Set(items.map((i) => i.categoria).filter(Boolean))] as string[]
  const disciplines = [...new Set(items.map((i) => i.disciplina).filter(Boolean))] as string[]
  const filtered = items.filter((item) => {
    if (categoryFilter && item.categoria !== categoryFilter) return false
    if (disciplineFilter && item.disciplina !== disciplineFilter) return false
    return true
  })
  const totalRef = filtered.reduce((acc, item) => acc + Number(item.valor_referencia ?? 0), 0)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => proposalsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equalization', pid, revision.id] })
      qc.invalidateQueries({ queryKey: ['all-proposals', pid] })
      toast.success('Proposta removida.')
      setDeleteConfirm(null)
    },
  })

  const winnerMutation = useMutation({
    mutationFn: (id: number) => proposalsAPI.update(id, { status: 'VENCEDORA', is_winner: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equalization', pid, revision.id] })
      toast.success('Proposta marcada como vencedora!')
    },
  })

  return (
    <div className={`rounded-2xl border-2 ${colors.border} overflow-hidden`}>
      {/* Section Header */}
      <div className={`${colors.header} text-white px-5 py-3 flex items-center justify-between gap-3 flex-wrap`}>
        <div className="flex items-center gap-2 flex-wrap">
          <GitBranch size={15} className="opacity-80" />
          <span className="font-bold">Revisão {revision.numero}</span>
          {revision.descricao && (
            <span className="text-sm opacity-70">— {revision.descricao}</span>
          )}
          {isLatest && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">Atual</span>
          )}
          <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full">
            {proposals.length} proposta{proposals.length !== 1 ? 's' : ''}
          </span>
          {proposals.some((p) => p.is_winner) && (
            <span className="text-xs bg-yellow-400/30 text-yellow-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Trophy size={10} /> Vencedora definida
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddProposal(revision.id)}
            disabled={proposals.length >= 10}
            title={proposals.length >= 10 ? 'Limite de 10 propostas atingido' : ''}
            className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 disabled:opacity-40 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Plus size={12} /> Nova Proposta
          </button>
          <button
            onClick={() => setTableExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {tableExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {tableExpanded ? 'Ocultar tabela' : 'Ver tabela'}
          </button>
        </div>
      </div>

      <div className="bg-white">
        {/* Proposal Cards */}
        {isLoading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Carregando…</div>
        ) : proposals.length === 0 ? (
          <div className="py-8 text-center">
            <Building2 size={36} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm">Nenhuma proposta nesta revisão.</p>
            <button
              onClick={() => onAddProposal(revision.id)}
              className="mt-2 text-blue-600 hover:underline text-xs"
            >
              Adicionar primeira proposta
            </button>
          </div>
        ) : (
          <div className="flex gap-3 p-4 overflow-x-auto pb-4">
            {proposals.map((p, idx) => (
              <div
                key={p.id}
                className={`card p-4 flex-shrink-0 w-52 ${p.is_winner ? 'border-green-400 border-2' : ''}`}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div>
                    <p className="text-xs font-bold text-gray-500">PROPOSTA {idx + 1}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate" title={p.empresa}>
                      {p.empresa}
                    </p>
                  </div>
                  {p.is_winner && <Trophy size={16} className="text-green-500 flex-shrink-0" />}
                </div>
                <p className="text-lg font-bold text-gray-900">{formatBRL(p.valor_total)}</p>
                <p className="text-xs text-gray-400">BDI: {Number(p.bdi_global).toFixed(2)}%</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${PROPOSAL_STATUS_COLORS[p.status]}`}>
                  {PROPOSAL_STATUS_LABELS[p.status as keyof typeof PROPOSAL_STATUS_LABELS]}
                </span>
                <div className="flex gap-1 mt-3">
                  <Link
                    to={`/projetos/${pid}/propostas/${p.id}`}
                    className="flex-1 text-center text-xs py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
                  >
                    <Pencil size={11} className="inline mr-1" />Editar
                  </Link>
                  {!p.is_winner && (
                    <button
                      onClick={() => winnerMutation.mutate(p.id)}
                      className="flex-1 text-center text-xs py-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100 font-medium"
                    >
                      <Trophy size={11} className="inline mr-1" />Vencer
                    </button>
                  )}
                  {deleteConfirm === p.id ? (
                    <>
                      <button
                        onClick={() => deleteMutation.mutate(p.id)}
                        className="text-xs px-1.5 py-1 rounded bg-red-600 text-white"
                      >
                        <Check size={11} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-1.5 py-1 rounded bg-gray-100"
                      >
                        <X size={11} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="text-xs px-1.5 py-1 rounded bg-gray-100 text-red-400 hover:bg-red-50"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                {/* Excel row */}
                <div className="flex gap-1 mt-1.5 border-t border-gray-100 pt-1.5">
                  <button
                    onClick={() => onDownloadTemplate(p.id, p.empresa)}
                    title="Baixar template para enviar ao proponente"
                    className="flex-1 text-center text-xs py-1.5 rounded bg-gray-50 text-gray-500 hover:bg-green-50 hover:text-green-600 font-medium transition-colors"
                  >
                    <FileDown size={11} className="inline mr-1" />Template
                  </button>
                  <button
                    onClick={() => onTriggerImport(p.id)}
                    disabled={importingId === p.id}
                    title="Importar Excel preenchido pelo proponente"
                    className="flex-1 text-center text-xs py-1.5 rounded bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-orange-600 font-medium transition-colors disabled:opacity-50"
                  >
                    <FileUp size={11} className="inline mr-1" />
                    {importingId === p.id ? 'Importando…' : 'Importar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expandable Table */}
        {tableExpanded && items.length > 0 && (
          <div className="border-t border-gray-100">
            {/* Filters */}
            {(categories.length > 0 || disciplines.length > 0) && (
              <div className="flex gap-3 p-4 flex-wrap items-center border-b border-gray-100 bg-gray-50">
                {categories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input w-auto text-xs"
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {disciplines.length > 0 && (
                  <select
                    value={disciplineFilter}
                    onChange={(e) => setDisciplineFilter(e.target.value)}
                    className="input w-auto text-xs"
                  >
                    <option value="">Todas as disciplinas</option>
                    {disciplines.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                {(categoryFilter || disciplineFilter) && (
                  <button
                    onClick={() => { setCategoryFilter(''); setDisciplineFilter('') }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X size={12} /> Limpar
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto">{filtered.length} de {items.length} itens</span>
              </div>
            )}

            {/* Table */}
            <div className="overflow-auto">
              <table className="text-xs border-collapse w-full min-w-max">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-3 py-3 text-left font-semibold w-16 bg-gray-800 sticky left-0 z-20">Item</th>
                    <th className="px-3 py-3 text-left font-semibold min-w-48">Descrição</th>
                    <th className="px-3 py-3 text-center font-semibold w-12">Un</th>
                    <th className="px-3 py-3 text-right font-semibold w-20">Qtd</th>
                    <th className="px-3 py-3 text-right font-semibold w-28 bg-gray-700">Ref. (R$)</th>
                    {proposals.map((p) => (
                      <th key={p.id} colSpan={2} className="px-3 py-3 text-center font-semibold border-l border-gray-600 min-w-52">
                        <div className="flex items-center justify-center gap-1">
                          {p.is_winner && <Trophy size={11} className="text-yellow-300" />}
                          <span className="truncate max-w-36" title={p.empresa}>{p.empresa}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-700 text-gray-200">
                    <th className="px-3 py-2 sticky left-0 z-20 bg-gray-700" />
                    <th className="px-3 py-2" />
                    <th /><th />
                    <th className="px-3 py-2 text-right text-xs font-normal text-gray-400">
                      {totalRef > 0 ? formatBRL(totalRef) : ''}
                    </th>
                    {proposals.map((p) => (
                      <React.Fragment key={p.id}>
                        <th className="px-3 py-2 text-right border-l border-gray-600 text-xs font-semibold">P.Unit.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">Total</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const priceVals = proposals.map((p) => item.precos[String(p.id)]).filter((v): v is number => v !== null && v !== undefined)
                    const minPrice = priceVals.length ? Math.min(...priceVals) : null
                    const maxPrice = priceVals.length ? Math.max(...priceVals) : null
                    return (
                      <tr key={item.pq_item_id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-500 bg-white sticky left-0 z-10">{item.numero_item}</td>
                        <td className="px-3 py-2 text-gray-700">
                          <div className="truncate max-w-xs" title={item.descricao}>{item.descricao}</div>
                          {item.categoria && <div className="text-gray-400 text-xs">{item.categoria}</div>}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">{item.unidade}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(item.quantidade, 2)}</td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {item.preco_referencia ? formatBRL(Number(item.preco_referencia)) : '—'}
                        </td>
                        {proposals.map((p) => {
                          const pu = item.precos[String(p.id)]
                          const total = item.totais[String(p.id)]
                          const cellColor = getCellColor(pu, minPrice, maxPrice)
                          return (
                            <React.Fragment key={p.id}>
                              <td className={`px-3 py-2 text-right border-l border-gray-100 ${cellColor}`}>
                                {pu != null ? formatBRL(pu) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className={`px-3 py-2 text-right ${cellColor}`}>
                                {total != null ? formatBRL(total) : <span className="text-gray-300">—</span>}
                              </td>
                            </React.Fragment>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold text-sm">
                    <td colSpan={5} className="px-3 py-3 text-right bg-gray-100 sticky left-0 z-10">
                      <span className="text-gray-600">TOTAL DA PROPOSTA:</span>
                    </td>
                    {proposals.map((p) => (
                      <React.Fragment key={p.id}>
                        <td className="px-3 py-3 text-right border-l border-gray-200" colSpan={2}>
                          {formatBRL(p.valor_total)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Legend */}
            <div className="flex gap-4 px-4 py-2 text-xs text-gray-400 flex-wrap border-t border-gray-100 bg-gray-50">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Menor preço</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block" /> Até 10% acima do menor</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Maior preço</span>
            </div>
          </div>
        )}

        {/* Table empty state when expanded */}
        {tableExpanded && items.length === 0 && !isLoading && proposals.length > 0 && (
          <div className="py-6 text-center text-gray-400 text-xs border-t border-gray-100">
            Nenhum item na PQ desta revisão com preços para exibir.
          </div>
        )}
      </div>
    </div>
  )
}

// ── NewProposalForm ────────────────────────────────────────────────────────────

interface NewProposalForm {
  empresa: string; cnpj: string; contato: string; email_contato: string; bdi_global: string
}

const EMPTY_FORM: NewProposalForm = {
  empresa: '', cnpj: '', contato: '', email_contato: '', bdi_global: '0',
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Equalization() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [modal, setModal] = useState(false)
  const [addingToRevisionId, setAddingToRevisionId] = useState<number | null>(null)
  const [modalTab, setModalTab] = useState<'existing' | 'new'>('existing')
  const [selectedProponente, setSelectedProponente] = useState<Proposal | null>(null)
  const [existingBdi, setExistingBdi] = useState('0')
  const [form, setForm] = useState<NewProposalForm>(EMPTY_FORM)
  const [importingId, setImportingId] = useState<number | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const pendingImportId = useRef<number | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', pid],
    queryFn: () => projectsAPI.get(pid).then((r) => r.data),
  })

  const { data: revisionsData } = useQuery<ProjectRevision[]>({
    queryKey: ['revisions', pid],
    queryFn: () => revisionsAPI.list(pid).then((r) => r.data),
  })
  const revisions: ProjectRevision[] = revisionsData ?? []

  const { data: allProposals = [] } = useQuery<Proposal[]>({
    queryKey: ['all-proposals', pid],
    queryFn: () => proposalsAPI.list(pid).then((r) => r.data),
  })

  // Companies already in the target revision
  const addingRevEmpresas = new Set(
    allProposals.filter((p) => p.revision_id === addingToRevisionId).map((p) => p.empresa)
  )
  // Existing proponents from other revisions not yet in this one
  const existingProponentes: Proposal[] = Object.values(
    allProposals
      .filter((p) => p.revision_id !== addingToRevisionId)
      .reduce<Record<string, Proposal>>((acc, p) => {
        if (!acc[p.empresa]) acc[p.empresa] = p
        return acc
      }, {})
  ).filter((p) => !addingRevEmpresas.has(p.empresa))

  function openModal(revisionId: number) {
    setAddingToRevisionId(revisionId)
    setSelectedProponente(null)
    setExistingBdi('0')
    setForm(EMPTY_FORM)
    setModalTab(existingProponentes.length > 0 ? 'existing' : 'new')
    setModal(true)
  }

  const createMutation = useMutation({
    mutationFn: () => proposalsAPI.create(pid, {
      ...form,
      bdi_global: Number(form.bdi_global) || 0,
      revision_id: addingToRevisionId,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['equalization', pid, addingToRevisionId] })
      qc.invalidateQueries({ queryKey: ['all-proposals', pid] })
      toast.success('Proposta criada!')
      setModal(false)
      setForm(EMPTY_FORM)
      navigate(`/projetos/${pid}/propostas/${res.data.id}`)
    },
    onError: (err: any) => toast.error(
      err?.response?.data?.detail
      ?? (err?.isServerStarting ? 'Servidor inicializando… tente novamente em 30s.' : 'Erro ao criar proposta')
    ),
  })

  const linkExistingMutation = useMutation({
    mutationFn: () => {
      if (!selectedProponente) throw new Error('Nenhum proponente selecionado')
      return proposalsAPI.create(pid, {
        empresa: selectedProponente.empresa,
        cnpj: selectedProponente.cnpj,
        contato: selectedProponente.contato,
        email_contato: selectedProponente.email_contato,
        telefone: selectedProponente.telefone,
        bdi_global: Number(existingBdi) || 0,
        revision_id: addingToRevisionId,
      })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['equalization', pid, addingToRevisionId] })
      qc.invalidateQueries({ queryKey: ['all-proposals', pid] })
      toast.success(`${selectedProponente?.empresa} vinculado à revisão!`)
      setModal(false)
      setSelectedProponente(null)
      navigate(`/projetos/${pid}/propostas/${res.data.id}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Erro ao vincular proponente'),
  })

  // ── Excel handlers ────────────────────────────────────────────────────────────
  async function handleDownloadTemplate(proposalId: number, empresa: string) {
    const toastId = toast.loading('Gerando template…')
    try {
      const res = await proposalsAPI.downloadTemplate(proposalId)
      downloadBlob(res.data, `template_${empresa}.xlsx`)
      toast.success('Template baixado!', { id: toastId })
    } catch {
      toast.error('Erro ao gerar template', { id: toastId })
    }
  }

  function triggerImport(proposalId: number) {
    pendingImportId.current = proposalId
    importRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const proposalId = pendingImportId.current
    if (!file || !proposalId) return
    e.target.value = ''
    pendingImportId.current = null

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Selecione um arquivo Excel (.xlsx ou .xls)')
      return
    }

    setImportingId(proposalId)
    const toastId = toast.loading('Importando preços…')
    try {
      await proposalsAPI.importExcel(proposalId, file)
      // Invalidate all revision equalization queries for this project
      await qc.invalidateQueries({ queryKey: ['equalization', pid] })
      await qc.invalidateQueries({ queryKey: ['all-proposals', pid] })
      toast.success('Preços importados com sucesso!', { id: toastId })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Erro ao importar o arquivo', { id: toastId })
    } finally {
      setImportingId(null)
    }
  }

  // Sorted revisions: Rev 0 first → latest last
  const sortedRevisions = [...revisions].sort((a, b) => a.numero - b.numero)
  const latestRevisionId = sortedRevisions.length > 0 ? sortedRevisions[sortedRevisions.length - 1].id : null

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/projetos" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Equalização de Propostas</h1>
            <p className="text-sm text-gray-500">{project?.nome}</p>
          </div>
        </div>
        {/* RevisionSelector: only for creating/deleting revisions */}
        {revisions.length > 0 && (
          <RevisionSelector
            projectId={pid}
            revisions={revisions}
            currentRevisionId={latestRevisionId}
            onRevisionChange={() => {}}
            onRevisionCreated={() => {}}
          />
        )}
      </div>

      {/* Stacked Revision Sections */}
      {sortedRevisions.length === 0 ? (
        <div className="card py-20 text-center">
          <Building2 size={52} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">Nenhuma revisão encontrada. Carregando…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedRevisions.map((revision, idx) => (
            <RevisionPanel
              key={revision.id}
              pid={pid}
              revision={revision}
              isLatest={revision.id === latestRevisionId}
              colorIndex={idx}
              onAddProposal={openModal}
              importingId={importingId}
              onDownloadTemplate={handleDownloadTemplate}
              onTriggerImport={triggerImport}
            />
          ))}
        </div>
      )}

      {/* Hidden import input */}
      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Modal: Nova Proposta */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Adicionar Proposta</h2>
                {addingToRevisionId && revisions.find((r) => r.id === addingToRevisionId) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Revisão {revisions.find((r) => r.id === addingToRevisionId)?.numero}
                    {revisions.find((r) => r.id === addingToRevisionId)?.descricao
                      ? ` — ${revisions.find((r) => r.id === addingToRevisionId)?.descricao}`
                      : ''}
                  </p>
                )}
              </div>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            {existingProponentes.length > 0 && (
              <div className="flex border-b border-gray-100 px-6 pt-3">
                <button
                  onClick={() => { setModalTab('existing'); setSelectedProponente(null) }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    modalTab === 'existing'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users size={14} />
                  Proponente existente
                  <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {existingProponentes.length}
                  </span>
                </button>
                <button
                  onClick={() => { setModalTab('new'); setSelectedProponente(null) }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    modalTab === 'new'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <UserPlus size={14} />
                  Novo proponente
                </button>
              </div>
            )}

            <div className="p-6 space-y-4">
              {/* Tab: Existing proponent */}
              {(modalTab === 'existing' && existingProponentes.length > 0) && (
                <>
                  <p className="text-sm text-gray-500">
                    Selecione o proponente que enviará proposta nesta revisão. Os dados cadastrais serão copiados automaticamente.
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {existingProponentes.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProponente(p)
                          setExistingBdi(String(Number(p.bdi_global) || 0))
                        }}
                        className={`w-full text-left border rounded-xl px-4 py-3 transition-all ${
                          selectedProponente?.empresa === p.empresa
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{p.empresa}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {p.cnpj && <span>{p.cnpj} · </span>}
                              {p.contato && <span>{p.contato}</span>}
                              {p.email_contato && <span> · {p.email_contato}</span>}
                            </p>
                          </div>
                          {selectedProponente?.empresa === p.empresa && (
                            <Check size={16} className="text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedProponente && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        BDI Global para esta revisão (%)
                      </label>
                      <input
                        className="input w-40"
                        type="number" step="0.01" min="0" max="100"
                        value={existingBdi}
                        onChange={(e) => setExistingBdi(e.target.value)}
                        autoFocus
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        BDI anterior: {Number(selectedProponente.bdi_global).toFixed(2)}%
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setModal(false)}
                      className="btn-secondary flex-1 justify-center"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => linkExistingMutation.mutate()}
                      disabled={!selectedProponente || linkExistingMutation.isPending}
                      className="btn-primary flex-1 justify-center"
                    >
                      {linkExistingMutation.isPending ? 'Vinculando…' : 'Vincular à revisão'}
                    </button>
                  </div>
                </>
              )}

              {/* Tab: New proponent */}
              {(modalTab === 'new' || existingProponentes.length === 0) && (
                <form
                  onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa / Proponente *</label>
                    <input
                      className="input"
                      placeholder="Razão social"
                      value={form.empresa}
                      onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                      <input className="input" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">BDI Global (%)</label>
                      <input
                        className="input text-center"
                        type="number" step="0.01" min="0" max="100"
                        placeholder="0.00"
                        value={form.bdi_global}
                        onChange={(e) => setForm((f) => ({ ...f, bdi_global: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
                      <input className="input" placeholder="Nome" value={form.contato} onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                      <input className="input" type="email" placeholder="email@empresa.com" value={form.email_contato} onChange={(e) => setForm((f) => ({ ...f, email_contato: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                    <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
                      {createMutation.isPending ? 'Criando…' : 'Criar e inserir preços'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
