import React, { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsAPI, proposalsAPI, projectsAPI, downloadBlob } from '../services/api'
import type { EqualizationResponse, ProposalComparisonItem, EqualizationProposal } from '../types'
import { PROPOSAL_STATUS_LABELS, formatBRL, formatNumber } from '../types'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, ArrowLeft, Trophy, X, Check, Building2, FileDown, FileUp } from 'lucide-react'

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  RECEBIDA: 'bg-gray-100 text-gray-600',
  EM_ANALISE: 'bg-blue-100 text-blue-700',
  VENCEDORA: 'bg-green-100 text-green-700',
  PERDEDORA: 'bg-red-100 text-red-600',
  DESCLASSIFICADA: 'bg-orange-100 text-orange-600',
}

function getCellColor(
  value: number | null,
  min: number | null,
  max: number | null,
): string {
  if (!value || !min || !max) return ''
  if (value === min) return 'bg-green-50 text-green-700 font-semibold'
  if (value === max) return 'bg-red-50 text-red-600'
  if (min > 0 && (value - min) / min < 0.1) return 'bg-yellow-50 text-amber-700'
  return ''
}

interface NewProposalForm {
  empresa: string; cnpj: string; contato: string; email_contato: string; bdi_global: string
}

const EMPTY_FORM: NewProposalForm = {
  empresa: '', cnpj: '', contato: '', email_contato: '', bdi_global: '0',
}

export default function Equalization() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<NewProposalForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [disciplineFilter, setDisciplineFilter] = useState<string>('')
  const [importingId, setImportingId] = useState<number | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const pendingImportId = useRef<number | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', pid],
    queryFn: () => projectsAPI.get(pid).then((r) => r.data),
  })

  const { data: equalization, isLoading, refetch } = useQuery<EqualizationResponse>({
    queryKey: ['equalization', pid],
    queryFn: () => analyticsAPI.getEqualization(pid).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => proposalsAPI.create(pid, {
      ...form,
      bdi_global: Number(form.bdi_global) || 0,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['equalization', pid] })
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => proposalsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equalization', pid] })
      toast.success('Proposta removida.')
      setDeleteConfirm(null)
    },
  })

  const winnerMutation = useMutation({
    mutationFn: (id: number) => proposalsAPI.update(id, { status: 'VENCEDORA', is_winner: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equalization', pid] })
      toast.success('Proposta marcada como vencedora!')
    },
  })

  // ── Excel handlers ──────────────────────────────────────────────────────────
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
      await qc.invalidateQueries({ queryKey: ['equalization', pid] })
      toast.success('Preços importados com sucesso!', { id: toastId })
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Erro ao importar o arquivo'
      toast.error(detail, { id: toastId })
    } finally {
      setImportingId(null)
    }
  }

  const proposals = equalization?.proposals ?? []
  const items = equalization?.items ?? []

  // Filtros
  const categories = [...new Set(items.map((i) => i.categoria).filter(Boolean))] as string[]
  const disciplines = [...new Set(items.map((i) => i.disciplina).filter(Boolean))] as string[]
  const filtered = items.filter((item) => {
    if (categoryFilter && item.categoria !== categoryFilter) return false
    if (disciplineFilter && item.disciplina !== disciplineFilter) return false
    return true
  })

  const totalRef = filtered.reduce((acc, item) => acc + (item.valor_referencia ?? 0), 0)

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
        <button
          onClick={() => setModal(true)}
          disabled={proposals.length >= 10}
          className="btn-primary"
          title={proposals.length >= 10 ? 'Limite de 10 propostas atingido' : ''}
        >
          <Plus size={16} /> Nova Proposta ({proposals.length}/10)
        </button>
      </div>

      {/* Cards das propostas */}
      {proposals.length > 0 && (
        <div className="flex gap-3 mb-5 overflow-x-auto pb-2">
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
              <p className="text-xs text-gray-400">BDI Global: {p.bdi_global.toFixed(2)}%</p>
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
                    <button onClick={() => deleteMutation.mutate(p.id)} className="text-xs px-1.5 py-1 rounded bg-red-600 text-white">
                      <Check size={11} />
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-xs px-1.5 py-1 rounded bg-gray-100">
                      <X size={11} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setDeleteConfirm(p.id)} className="text-xs px-1.5 py-1 rounded bg-gray-100 text-red-400 hover:bg-red-50">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
              {/* Linha de Excel */}
              <div className="flex gap-1 mt-1.5 border-t border-gray-100 pt-1.5">
                <button
                  onClick={() => handleDownloadTemplate(p.id, p.empresa)}
                  title="Baixar template para enviar ao licitante"
                  className="flex-1 text-center text-xs py-1.5 rounded bg-gray-50 text-gray-500 hover:bg-green-50 hover:text-green-600 font-medium transition-colors"
                >
                  <FileDown size={11} className="inline mr-1" />Template
                </button>
                <button
                  onClick={() => triggerImport(p.id)}
                  disabled={importingId === p.id}
                  title="Importar Excel preenchido pelo licitante"
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

      {/* Filtros */}
      {items.length > 0 && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-auto text-sm"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="input w-auto text-sm"
          >
            <option value="">Todas as disciplinas</option>
            {disciplines.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {(categoryFilter || disciplineFilter) && (
            <button
              onClick={() => { setCategoryFilter(''); setDisciplineFilter('') }}
              className="btn-secondary text-xs"
            >
              <X size={13} /> Limpar filtros
            </button>
          )}
          <span className="text-sm text-gray-400 self-center">
            {filtered.length} de {items.length} itens
          </span>
        </div>
      )}

      {/* Tabela de equalização */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando equalização…</div>
      ) : proposals.length === 0 ? (
        <div className="card py-20 text-center">
          <Building2 size={52} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 mb-4">Nenhuma proposta cadastrada.</p>
          <button onClick={() => setModal(true)} className="btn-primary mx-auto">
            <Plus size={16} /> Adicionar primeira proposta
          </button>
        </div>
      ) : (
        <div className="card overflow-auto">
          <table className="text-xs border-collapse w-full table-sticky">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-3 py-3 text-left font-semibold w-16 bg-gray-800 sticky left-0 z-20">Item</th>
                <th className="px-3 py-3 text-left font-semibold min-w-48">Descrição</th>
                <th className="px-3 py-3 text-center font-semibold w-12">Un</th>
                <th className="px-3 py-3 text-right font-semibold w-20">Qtd</th>
                <th className="px-3 py-3 text-right font-semibold w-28 bg-gray-700">Ref. (R$)</th>
                {proposals.map((p, i) => (
                  <th key={p.id} colSpan={2} className="px-3 py-3 text-center font-semibold border-l border-gray-600 min-w-52">
                    <div className="flex items-center justify-center gap-1">
                      {p.is_winner && <Trophy size={11} className="text-yellow-300" />}
                      <span className="truncate max-w-36" title={p.empresa}>{p.empresa}</span>
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-700 text-gray-200">
                <th className="px-3 py-2 sticky left-0 z-20 bg-gray-700"></th>
                <th className="px-3 py-2"></th>
                <th></th>
                <th></th>
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
                const priceValues = proposals.map((p) => item.precos[String(p.id)]).filter((v): v is number => v !== null && v !== undefined)
                const minPrice = priceValues.length ? Math.min(...priceValues) : null
                const maxPrice = priceValues.length ? Math.max(...priceValues) : null

                return (
                  <tr key={item.pq_item_id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-500 bg-white sticky left-0 z-10">{item.numero_item}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <div className="truncate max-w-xs" title={item.descricao}>{item.descricao}</div>
                      {item.categoria && (
                        <div className="text-gray-400 text-xs">{item.categoria}</div>
                      )}
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
            {/* Totais */}
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
      )}

      {/* Input oculto de importação */}
      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Legenda */}
      {proposals.length > 0 && (
        <div className="flex gap-4 mt-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Menor preço</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block" /> Até 10% acima do menor</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Maior preço</span>
          <span className="ml-auto flex items-center gap-1"><FileDown size={11} /> Template = Excel vazio para enviar ao licitante · <FileUp size={11} /> Importar = Excel preenchido recebido</span>
        </div>
      )}

      {/* Modal nova proposta */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Nova Proposta</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa / Licitante *</label>
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
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
                  {createMutation.isPending ? 'Criando…' : 'Criar e inserir preços'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
