import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proposalsAPI, pqAPI, projectsAPI, downloadBlob } from '../services/api'
import type { ProposalWithItems, PQItem } from '../types'
import { formatBRL, formatNumber } from '../types'
import toast from 'react-hot-toast'
import { Save, ArrowLeft, Building2, FileDown, FileUp, FileSpreadsheet, ChevronDown } from 'lucide-react'

type PriceMap = Record<number, {
  preco_unitario: string
  bdi: string
  custo_unit_com_reidi: string
  bdi_com_reidi: string
}>

export default function ProposalInput() {
  const { projectId, proposalId } = useParams<{ projectId: string; proposalId: string }>()
  const pid = Number(projectId)
  const rid = Number(proposalId)
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
    queryKey: ['pq', pid, proposal?.revision_id ?? null],
    queryFn: () => pqAPI.list(pid, proposal?.revision_id ?? undefined).then((r) => r.data),
    enabled: !!proposal,
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
          bdi: item.bdi ? Number(item.bdi).toFixed(4) : '',
          custo_unit_com_reidi: item.custo_unit_com_reidi ? String(item.custo_unit_com_reidi) : '',
          bdi_com_reidi: item.bdi_com_reidi ? Number(item.bdi_com_reidi).toFixed(4) : '',
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
        custo_unit_com_reidi: prices[pq.id]?.custo_unit_com_reidi ? Number(prices[pq.id].custo_unit_com_reidi) : null,
        bdi_com_reidi: prices[pq.id]?.bdi_com_reidi ? Number(prices[pq.id].bdi_com_reidi) : null,
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

  function setPrice(pqId: number, field: keyof PriceMap[number], value: string) {
    setPrices((prev) => ({
      ...prev,
      [pqId]: {
        ...(prev[pqId] ?? { preco_unitario: '', bdi: '', custo_unit_com_reidi: '', bdi_com_reidi: '' }),
        [field]: value,
      },
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
      const newMap: PriceMap = {}
      res.data.items.forEach((item: any) => {
        newMap[item.pq_item_id] = {
          preco_unitario: item.preco_unitario ? String(item.preco_unitario) : '',
          bdi: item.bdi ? String(item.bdi) : '',
          custo_unit_com_reidi: item.custo_unit_com_reidi ? String(item.custo_unit_com_reidi) : '',
          bdi_com_reidi: item.bdi_com_reidi ? String(item.bdi_com_reidi) : '',
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

  // Individual BDI é fração (0.43 = 43%) → fator = (1 + BDI)
  // BDI Global é percentual (43 = 43%) → fator = (1 + BDI/100)
  function bdiFactorSem(pqId: number): number {
    const indiv = prices[pqId]?.bdi
    if (indiv && indiv !== '') return 1 + Number(indiv)
    return 1 + (Number(bdiGlobal) || 0) / 100
  }
  function bdiFactorCom(pqId: number): number {
    const hasCom = !!(prices[pqId]?.custo_unit_com_reidi)
    const indiv = hasCom ? prices[pqId]?.bdi_com_reidi : prices[pqId]?.bdi
    if (indiv && indiv !== '') return 1 + Number(indiv)
    return 1 + (Number(bdiGlobal) || 0) / 100
  }

  // Total COM REIDI — mesma lógica do backend (analytics usa este valor)
  const total = pqItems.reduce((acc, pq) => {
    const comPrice = Number(prices[pq.id]?.custo_unit_com_reidi) || Number(prices[pq.id]?.preco_unitario) || 0
    return acc + (comPrice > 0 ? pq.quantidade * comPrice * bdiFactorCom(pq.id) : 0)
  }, 0)

  const totalRef = pqItems.reduce((acc, pq) => acc + pq.quantidade * (pq.preco_referencia ?? 0), 0)
  const desvio = totalRef > 0 ? ((total - totalRef) / totalRef) * 100 : null

  if (loadingProposal) return <div className="p-8 text-gray-400">Carregando proposta…</div>
  if (!proposal) return <div className="p-8 text-red-500">Proposta não encontrada.</div>

  const totalSemGlobal = pqItems.reduce((acc, pq) => {
    const cudSem = Number(prices[pq.id]?.preco_unitario) || 0
    const cudBdi = cudSem > 0 ? cudSem * bdiFactorSem(pq.id) : 0
    return acc + (cudBdi > 0 ? pq.quantidade * cudBdi : 0)
  }, 0)

  return (
    <div className="px-6 py-4 max-w-[1800px] mx-auto flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
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
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total SEM REIDI</p>
              <p className="text-base font-bold text-orange-700">{formatBRL(totalSemGlobal)}</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-right">
              <p className="text-xs text-gray-400">Total COM REIDI</p>
              <p className="text-lg font-bold text-gray-900">{formatBRL(total)}</p>
              {desvio !== null && (
                <p className={`text-xs font-medium ${desvio > 10 ? 'text-red-500' : desvio < -10 ? 'text-green-600' : 'text-gray-500'}`}>
                  {desvio > 0 ? '+' : ''}{desvio.toFixed(1)}% vs. referência
                </p>
              )}
            </div>
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
      <div className="card p-3 mb-2 flex items-center gap-6 flex-shrink-0">
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
          <span className="text-xs text-gray-400">Aplicado a itens sem BDI individual</span>
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
        <div className="card overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Linha de grupo — idêntico ao cabeçalho do Excel */}
              <tr className="text-xs font-bold text-center">
                <th colSpan={12} className="px-2 py-2 text-blue-900 bg-blue-700 text-white border-r border-blue-800">
                  PLANILHA DE QUANTITATIVOS
                </th>
                <th colSpan={4} className="px-2 py-2 text-white bg-orange-700 border-r border-orange-800">
                  SEM REIDI
                </th>
                <th colSpan={4} className="px-2 py-2 text-white bg-green-700">
                  COM REIDI
                </th>
              </tr>
              {/* Linha de colunas individuais — mesmos rótulos do Excel */}
              <tr className="bg-gray-100 text-gray-600 text-xs">
                <th className="px-2 py-2 text-left font-semibold w-16 whitespace-nowrap">Item</th>
                <th className="px-2 py-2 text-left font-semibold w-28 whitespace-nowrap">Localidade</th>
                <th className="px-2 py-2 text-left font-semibold w-24 whitespace-nowrap">Disciplina</th>
                <th className="px-2 py-2 text-left font-semibold w-32 whitespace-nowrap">Categoria</th>
                <th className="px-2 py-2 text-left font-semibold w-20 whitespace-nowrap">Código</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[300px] whitespace-nowrap">Descrição</th>
                <th className="px-2 py-2 text-center font-semibold w-20 whitespace-nowrap">Unidade Medida</th>
                <th className="px-2 py-2 text-right font-semibold w-24 whitespace-nowrap">Quantidade</th>
                <th className="px-2 py-2 text-left font-semibold w-20 whitespace-nowrap">Referência</th>
                <th className="px-2 py-2 text-right font-semibold w-28 whitespace-nowrap">Preço Unit. RF</th>
                <th className="px-2 py-2 text-right font-semibold w-28 whitespace-nowrap bg-blue-50">Preço Total RF</th>
                <th className="px-2 py-2 text-left font-semibold w-28 whitespace-nowrap border-r border-blue-300">Observação</th>
                {/* SEM REIDI — mesmos rótulos do Excel */}
                <th className="px-2 py-2 text-right font-semibold w-32 whitespace-nowrap text-orange-800 bg-orange-50">Custo Unit. Direto</th>
                <th className="px-2 py-2 text-right font-semibold w-20 whitespace-nowrap text-orange-800 bg-orange-50">BDI (%)</th>
                <th className="px-2 py-2 text-right font-semibold w-32 whitespace-nowrap text-orange-800 bg-orange-50">Custo Unit. c/BDI</th>
                <th className="px-2 py-2 text-right font-semibold w-32 whitespace-nowrap text-orange-800 bg-orange-100 border-r border-orange-300">Custo Total c/BDI</th>
                {/* COM REIDI — mesmos rótulos do Excel */}
                <th className="px-2 py-2 text-right font-semibold w-32 whitespace-nowrap text-green-800 bg-green-50">Custo Unit. Direto</th>
                <th className="px-2 py-2 text-right font-semibold w-20 whitespace-nowrap text-green-800 bg-green-50">BDI (%)</th>
                <th className="px-2 py-2 text-right font-semibold w-32 whitespace-nowrap text-green-800 bg-green-50">Custo Unit. c/BDI</th>
                <th className="px-2 py-2 text-right font-semibold w-32 whitespace-nowrap text-green-800 bg-green-100">Custo Total c/BDI</th>
              </tr>
            </thead>
            <tbody>
              {pqItems.map((pq) => {
                // PQ computed
                const pTotalRF = pq.quantidade * (pq.preco_referencia ?? 0)

                // SEM REIDI — BDI individual é fração (0.43 = 43%)
                const cudSem = Number(prices[pq.id]?.preco_unitario) || 0
                const cudBdiSem = cudSem > 0 ? cudSem * bdiFactorSem(pq.id) : 0
                const totalSem = cudBdiSem > 0 ? pq.quantidade * cudBdiSem : 0

                // COM REIDI — BDI individual é fração (0.43 = 43%)
                const cudCom = Number(prices[pq.id]?.custo_unit_com_reidi) || 0
                const cudBdiCom = cudCom > 0 ? cudCom * bdiFactorCom(pq.id) : 0
                const totalCom = cudBdiCom > 0 ? pq.quantidade * cudBdiCom : 0

                return (
                  <tr key={pq.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    {/* PQ info */}
                    <td className="px-2 py-1 text-xs font-mono text-gray-500 whitespace-nowrap">{pq.numero_item}</td>
                    <td className="px-2 py-1 text-xs text-gray-400 whitespace-nowrap">{pq.localidade || '—'}</td>
                    <td className="px-2 py-1 text-xs text-gray-400 whitespace-nowrap">{pq.disciplina || '—'}</td>
                    <td className="px-2 py-1 text-xs text-gray-400 whitespace-nowrap">{pq.categoria || '—'}</td>
                    <td className="px-2 py-1 text-xs text-gray-400 whitespace-nowrap">{pq.codigo || '—'}</td>
                    <td className="px-2 py-1 text-xs text-gray-700 whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis" title={pq.descricao}>{pq.descricao}</td>
                    <td className="px-2 py-1 text-xs text-center text-gray-500">{pq.unidade}</td>
                    <td className="px-2 py-1 text-right text-xs tabular-nums">{formatNumber(pq.quantidade, 4)}</td>
                    <td className="px-2 py-1 text-xs text-gray-400 whitespace-nowrap">{pq.referencia_codigo || '—'}</td>
                    <td className="px-2 py-1 text-right text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {pq.preco_referencia ? formatBRL(pq.preco_referencia) : '—'}
                    </td>
                    <td className="px-2 py-1 text-right text-xs font-medium text-blue-700 bg-blue-50/30 tabular-nums whitespace-nowrap">
                      {pTotalRF > 0 ? formatBRL(pTotalRF) : '—'}
                    </td>
                    <td className="px-2 py-1 text-xs text-gray-400 border-r border-blue-100">{pq.observacao || ''}</td>

                    {/* SEM REIDI */}
                    <td className="px-1 py-0.5 bg-orange-50/20">
                      <input
                        type="number" step="0.0001" min="0"
                        value={prices[pq.id]?.preco_unitario ?? ''}
                        onChange={(e) => setPrice(pq.id, 'preco_unitario', e.target.value)}
                        placeholder="0.0000"
                        className="w-full text-right text-xs border border-orange-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-orange-50"
                      />
                    </td>
                    <td className="px-1 py-0.5 bg-orange-50/20">
                      <input
                        type="text" inputMode="decimal"
                        value={prices[pq.id]?.bdi ?? ''}
                        onChange={(e) => setPrice(pq.id, 'bdi', e.target.value)}
                        placeholder={bdiGlobal ? Number(bdiGlobal).toFixed(4) : '0.0000'}
                        className="w-full text-right text-xs border border-orange-100 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-white"
                      />
                    </td>
                    <td className="px-2 py-1 text-right text-xs text-orange-700 bg-orange-50/20 tabular-nums whitespace-nowrap">
                      {cudBdiSem > 0 ? formatBRL(cudBdiSem) : '—'}
                    </td>
                    <td className="px-2 py-1 text-right text-xs font-medium text-orange-800 bg-orange-50/20 tabular-nums whitespace-nowrap border-r border-orange-100">
                      {totalSem > 0 ? formatBRL(totalSem) : '—'}
                    </td>

                    {/* COM REIDI */}
                    <td className="px-1 py-0.5 bg-green-50/20">
                      <input
                        type="number" step="0.0001" min="0"
                        value={prices[pq.id]?.custo_unit_com_reidi ?? ''}
                        onChange={(e) => setPrice(pq.id, 'custo_unit_com_reidi', e.target.value)}
                        placeholder="0.0000"
                        className="w-full text-right text-xs border border-green-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-green-400 bg-green-50"
                      />
                    </td>
                    <td className="px-1 py-0.5 bg-green-50/20">
                      <input
                        type="text" inputMode="decimal"
                        value={prices[pq.id]?.bdi_com_reidi ?? ''}
                        onChange={(e) => setPrice(pq.id, 'bdi_com_reidi', e.target.value)}
                        placeholder={bdiGlobal ? Number(bdiGlobal).toFixed(4) : '0.0000'}
                        className="w-full text-right text-xs border border-green-100 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-green-300 bg-white"
                      />
                    </td>
                    <td className="px-2 py-1 text-right text-xs text-green-700 bg-green-50/20 tabular-nums whitespace-nowrap">
                      {cudBdiCom > 0 ? formatBRL(cudBdiCom) : '—'}
                    </td>
                    <td className="px-2 py-1 text-right text-xs font-medium text-green-800 bg-green-50/20 tabular-nums whitespace-nowrap">
                      {totalCom > 0 ? formatBRL(totalCom) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td colSpan={15} className="px-3 py-2.5 text-right text-gray-600 text-sm">
                  Total SEM REIDI:
                </td>
                <td className="px-3 py-2.5 text-right text-orange-800 text-sm tabular-nums whitespace-nowrap">
                  {formatBRL(totalSemGlobal)}
                </td>
                <td colSpan={3} className="px-3 py-2.5 text-right text-gray-600 text-sm">
                  Total COM REIDI:
                </td>
                <td className="px-3 py-2.5 text-right text-green-900 text-base tabular-nums whitespace-nowrap">
                  {formatBRL(total)}
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

      <p className="text-xs text-gray-400 py-2 flex-shrink-0">
        Campos editáveis destacados (laranja = SEM REIDI · verde = COM REIDI) · Análise comparativa usa preços COM REIDI
      </p>
    </div>
  )
}
