import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proposalsAPI, pqAPI, projectsAPI, downloadBlob } from '../services/api'
import type { ProposalWithItems, PQItem } from '../types'
import { formatBRL, formatNumber } from '../types'
import toast from 'react-hot-toast'
import { Save, ArrowLeft, Building2, FileDown, FileUp, FileSpreadsheet, ChevronDown } from 'lucide-react'

type PriceMap = Record<number, { preco_unitario: string; bdi: string }>

export default function ProposalInput() {
  const { projectId, proposalId } = useParams<{ projectId: string; proposalId: string }>()
  const pid = Number(projectId)
  const rid = Number(proposalId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const importRef = useRef<HTMLInputElement>(null)
  const [excelMenu, setExcelMenu] = useState(false)
  const [importing, setImporting] = useState(false)

  const { data: project } = useQuery({
    queryKey: ['project', pid],
    queryFn: () => projectsAPI.get(pid).then((r) => r.data),
  })

  const { data: proposal, isLoading: loadingProposal } = useQuery<ProposalWithItems>({
    queryKey: ['proposal-items', rid],
    queryFn: () => proposalsAPI.getWithItems(rid).then((r) => r.data),
  })

  const { data: _rawPqItems } = useQuery<PQItem[]>({
    queryKey: ['pq', pid],
    queryFn: () => pqAPI.list(pid).then((r) => r.data),
  })
  const pqItems: PQItem[] = Array.isArray(_rawPqItems) ? _rawPqItems : []

  const [prices, setPrices] = useState<PriceMap>({})
  const [bdiGlobal, setBdiGlobal] = useState<string>('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (proposal) {
      setBdiGlobal(String(proposal.bdi_global ?? '0'))
      const map: PriceMap = {}
      proposal.items.forEach((item) => {
        map[item.pq_item_id] = {
          preco_unitario: item.preco_unitario ? String(item.preco_unitario) : '',
          bdi: item.bdi ? String(item.bdi) : '',
        }
      })
      setPrices(map)
    }
  }, [proposal])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await proposalsAPI.update(rid, { bdi_global: Number(bdiGlobal) || 0 })
      const items = pqItems.map((pq) => ({
        pq_item_id: pq.id,
        preco_unitario: prices[pq.id]?.preco_unitario ? Number(prices[pq.id].preco_unitario) : null,
        bdi: prices[pq.id]?.bdi ? Number(prices[pq.id].bdi) : null,
      }))
      return proposalsAPI.updateItems(rid, items)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposal-items', rid] })
      qc.invalidateQueries({ queryKey: ['proposals', pid] })
      toast.success('Proposta salva!')
      setDirty(false)
    },
    onError: () => toast.error('Erro ao salvar a proposta'),
  })

  function setPrice(pqId: number, field: 'preco_unitario' | 'bdi', value: string) {
    setPrices((prev) => ({
      ...prev,
      [pqId]: { ...(prev[pqId] ?? { preco_unitario: '', bdi: '' }), [field]: value },
    }))
    setDirty(true)
  }

  // ── Excel: baixar template da proposta ────────────────────────────────────────
  async function handleDownloadTemplate() {
    setExcelMenu(false)
    const toastId = toast.loading('Gerando template…')
    try {
      const res = await proposalsAPI.downloadTemplate(rid)
      downloadBlob(res.data, `template_${proposal?.empresa ?? rid}.xlsx`)
      toast.success('Template baixado!', { id: toastId })
    } catch {
      toast.error('Erro ao gerar template', { id: toastId })
    }
  }

  // ── Excel: exportar proposta com preços ───────────────────────────────────────
  async function handleExport() {
    setExcelMenu(false)
    const toastId = toast.loading('Exportando proposta…')
    try {
      const res = await proposalsAPI.exportExcel(rid)
      downloadBlob(res.data, `proposta_${proposal?.empresa ?? rid}.xlsx`)
      toast.success('Exportado!', { id: toastId })
    } catch {
      toast.error('Erro ao exportar', { id: toastId })
    }
  }

  // ── Excel: importar proposta preenchida ───────────────────────────────────────
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Selecione um arquivo Excel (.xlsx ou .xls)')
      return
    }

    setImporting(true)
    const toastId = toast.loading('Importando preços…')
    try {
      const res = await proposalsAPI.importExcel(rid, file)
      // Atualiza o mapa de preços com os dados importados
      const newMap: PriceMap = {}
      res.data.items.forEach((item: any) => {
        newMap[item.pq_item_id] = {
          preco_unitario: item.preco_unitario ? String(item.preco_unitario) : '',
          bdi: item.bdi ? String(item.bdi) : '',
        }
      })
      setPrices(newMap)
      await qc.invalidateQueries({ queryKey: ['proposal-items', rid] })
      toast.success('Preços importados com sucesso!', { id: toastId })
      setDirty(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Erro ao importar o arquivo'
      toast.error(detail, { id: toastId })
    } finally {
      setImporting(false)
      setExcelMenu(false)
    }
  }

  const total = pqItems.reduce((acc, pq) => {
    const pu = Number(prices[pq.id]?.preco_unitario) || 0
    const bdiItem = Number(prices[pq.id]?.bdi) || Number(bdiGlobal) || 0
    return acc + pq.quantidade * pu * (1 + bdiItem / 100)
  }, 0)

  const totalRef = pqItems.reduce((acc, pq) => {
    return acc + pq.quantidade * (pq.preco_referencia ?? 0)
  }, 0)

  const desvio = totalRef > 0 ? ((total - totalRef) / totalRef) * 100 : null

  if (loadingProposal) return <div className="p-8 text-gray-400">Carregando proposta…</div>
  if (!proposal) return <div className="p-8 text-red-500">Proposta não encontrada.</div>

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to={`/projetos/${pid}/equalizacao`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">{proposal.empresa}</h1>
            </div>
            <p className="text-sm text-gray-500">{project?.nome} · Inserção de Preços</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">Total da Proposta</p>
            <p className="text-lg font-bold text-gray-900">{formatBRL(total)}</p>
            {desvio !== null && (
              <p className={`text-xs font-medium ${desvio > 10 ? 'text-red-500' : desvio < -10 ? 'text-green-600' : 'text-gray-500'}`}>
                {desvio > 0 ? '+' : ''}{desvio.toFixed(1)}% vs. referência
              </p>
            )}
          </div>

          {/* Menu Excel */}
          <div className="relative">
            <button
              onClick={() => setExcelMenu((v) => !v)}
              disabled={importing}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet size={15} className="text-green-600" />
              Excel
              <ChevronDown size={13} />
            </button>
            {excelMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExcelMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-52 py-1 overflow-hidden">
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Para o proponente
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <FileDown size={15} className="text-blue-500" />
                    Baixar Template (vazio)
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <p className="px-4 pt-1 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Após receber o arquivo
                  </p>
                  <button
                    onClick={() => importRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <FileUp size={15} className="text-orange-500" />
                    Importar Preços
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <FileDown size={15} className="text-green-600" />
                    Exportar com Preços
                  </button>
                </div>
              </>
            )}
          </div>

          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !dirty}
            className="btn-primary"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Salvando…' : dirty ? 'Salvar*' : 'Salvo'}
          </button>
        </div>
      </div>

      {/* BDI Global */}
      <div className="card p-4 mb-4 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">BDI Global (%):</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={bdiGlobal}
            onChange={(e) => { setBdiGlobal(e.target.value); setDirty(true) }}
            className="input w-24 text-center"
            placeholder="0.00"
          />
          <span className="text-xs text-gray-400">Aplicado a todos os itens sem BDI individual</span>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          CNPJ: <strong>{proposal.cnpj ?? '—'}</strong> ·
          Contato: <strong>{proposal.contato ?? '—'}</strong>
        </div>
      </div>

      {/* Tabela de preços */}
      {importing ? (
        <div className="text-center py-20 text-gray-400">Importando preços do Excel…</div>
      ) : (
        <div className="card overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-xs">
                <th className="px-3 py-3 text-left font-semibold w-16">Item</th>
                <th className="px-3 py-3 text-left font-semibold w-20">Código</th>
                <th className="px-3 py-3 text-left font-semibold">Descrição</th>
                <th className="px-3 py-3 text-left font-semibold w-16">Un</th>
                <th className="px-3 py-3 text-right font-semibold w-24">Qtd</th>
                <th className="px-3 py-3 text-right font-semibold w-32">Preço Ref. (R$)</th>
                <th className="px-3 py-3 text-right font-semibold w-32 text-blue-600">Preço Unit. *</th>
                <th className="px-3 py-3 text-right font-semibold w-20 text-blue-600">BDI %</th>
                <th className="px-3 py-3 text-right font-semibold w-36">Total (R$)</th>
                <th className="px-3 py-3 text-right font-semibold w-20">Δ Ref.</th>
              </tr>
            </thead>
            <tbody>
              {pqItems.map((pq) => {
                const pu = Number(prices[pq.id]?.preco_unitario) || 0
                const bdiItem = Number(prices[pq.id]?.bdi) || Number(bdiGlobal) || 0
                const lineTotal = pq.quantidade * pu * (1 + bdiItem / 100)
                const refTotal = pq.quantidade * (pq.preco_referencia ?? 0)
                const delta = refTotal > 0 && pu > 0
                  ? ((pu - (pq.preco_referencia ?? 0)) / (pq.preco_referencia ?? 1)) * 100
                  : null

                return (
                  <tr key={pq.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-3 py-2 text-xs font-mono text-gray-500">{pq.numero_item}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{pq.codigo}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      <div>{pq.descricao}</div>
                      {(pq.categoria || pq.disciplina) && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {[pq.categoria, pq.disciplina].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-center text-gray-500">{pq.unidade}</td>
                    <td className="px-3 py-2 text-right text-sm">{formatNumber(pq.quantidade, 4)}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-400">
                      {pq.preco_referencia ? formatBRL(pq.preco_referencia) : '—'}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={prices[pq.id]?.preco_unitario ?? ''}
                        onChange={(e) => setPrice(pq.id, 'preco_unitario', e.target.value)}
                        placeholder="0,0000"
                        className="w-full text-right text-sm border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={prices[pq.id]?.bdi ?? ''}
                        onChange={(e) => setPrice(pq.id, 'bdi', e.target.value)}
                        placeholder={bdiGlobal || '0'}
                        className="w-full text-right text-sm border border-blue-100 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium">
                      {lineTotal > 0 ? formatBRL(lineTotal) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {delta !== null ? (
                        <span className={delta > 15 ? 'text-red-500 font-bold' : delta < -15 ? 'text-green-600 font-bold' : 'text-gray-500'}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td colSpan={8} className="px-3 py-3 text-right text-gray-600">Total da Proposta:</td>
                <td className="px-3 py-3 text-right text-gray-900 text-base">{formatBRL(total)}</td>
                <td className="px-3 py-3 text-right text-sm">
                  {desvio !== null && (
                    <span className={desvio > 0 ? 'text-red-500' : 'text-green-600'}>
                      {desvio > 0 ? '+' : ''}{desvio.toFixed(1)}%
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>

          {pqItems.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-400">Nenhum item na Planilha PQ.</p>
              <Link to={`/projetos/${pid}/pq`} className="btn-primary mt-3 text-sm mx-auto">
                Ir para Planilha PQ
              </Link>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        * Campos em azul são editáveis · Preço Total = Qtd × Preço Unitário × (1 + BDI%)
      </p>
    </div>
  )
}
