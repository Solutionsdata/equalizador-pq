import React, { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { analyticsAPI, projectsAPI, downloadBlob } from '../services/api'
import type {
  ParetoData, EqualizationResponse, DisciplineSummary, CategoriaSummary,
  EqualizationProposal,
} from '../types'
import { formatBRL, formatPercent, formatNumber } from '../types'
import ParetoChart from '../components/Charts/ParetoChart'
import ABCCurveChart from '../components/Charts/ABCCurveChart'
import DisciplineChart from '../components/Charts/DisciplineChart'
import {
  ArrowLeft, BarChart3, TrendingUp, GitCompare,
  Sparkles, Users, Download, Filter, X,
  ChevronUp, ChevronDown, Trophy, AlertTriangle, CheckCircle,
  PieChart,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'pareto' | 'comparativo' | 'cherry' | 'fornecedores' | 'distribuicao'

interface Filters {
  categoria: string
  disciplina: string
  fornecedores: string[] // proposal IDs selected; empty = all
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pctDiff(price: number, ref: number | undefined): number | null {
  if (!ref) return null
  return ((price - ref) / ref) * 100
}

function deviationClass(pct: number | null): string {
  if (pct === null) return ''
  if (pct > 20) return 'text-red-600 font-semibold'
  if (pct > 5) return 'text-amber-600'
  if (pct < -10) return 'text-blue-600'
  return 'text-green-700'
}

function pctBadge(pct: number | null) {
  if (pct === null) return <span className="text-gray-300">—</span>
  const cls = pct > 20
    ? 'bg-red-50 text-red-600 border border-red-200'
    : pct > 5
      ? 'bg-amber-50 text-amber-600 border border-amber-200'
      : pct < -10
        ? 'bg-blue-50 text-blue-600 border border-blue-200'
        : 'bg-green-50 text-green-700 border border-green-200'
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cls}`}>
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-20 text-center">
      <BarChart3 size={48} className="mx-auto text-gray-200 mb-3" />
      <p className="text-gray-400 text-sm max-w-sm mx-auto">{message}</p>
    </div>
  )
}

function Loading() {
  return <div className="py-20 text-center text-gray-400 text-sm">Calculando…</div>
}

// ── Filtros laterais ──────────────────────────────────────────────────────────

function FilterBar({
  filters, setFilters, proposals, categorias, disciplinas,
}: {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  proposals: EqualizationProposal[]
  categorias: string[]
  disciplinas: string[]
}) {
  const hasActive = filters.categoria || filters.disciplina || filters.fornecedores.length > 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={14} /> Filtros
        </div>
        {hasActive && (
          <button
            onClick={() => setFilters({ categoria: '', disciplina: '', fornecedores: [] })}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <X size={11} /> Limpar
          </button>
        )}
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Categoria</label>
        <select
          value={filters.categoria}
          onChange={(e) => setFilters((f) => ({ ...f, categoria: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Disciplina */}
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Disciplina</label>
        <select
          value={filters.disciplina}
          onChange={(e) => setFilters((f) => ({ ...f, disciplina: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas</option>
          {disciplinas.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Fornecedores */}
      {proposals.length > 0 && (
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Fornecedores</label>
          <div className="space-y-1.5">
            {proposals.map((p) => {
              const checked = filters.fornecedores.length === 0 || filters.fornecedores.includes(String(p.id))
              return (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setFilters((f) => {
                        if (f.fornecedores.length === 0) {
                          // switch from "all" to specific: unselect this one
                          return { ...f, fornecedores: proposals.filter((x) => x.id !== p.id).map((x) => String(x.id)) }
                        }
                        if (checked) {
                          const next = f.fornecedores.filter((x) => x !== String(p.id))
                          return { ...f, fornecedores: next.length === 0 ? [] : next }
                        } else {
                          const next = [...f.fornecedores, String(p.id)]
                          return { ...f, fornecedores: next.length === proposals.length ? [] : next }
                        }
                      })
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="text-xs text-gray-600 truncate group-hover:text-gray-900">{p.empresa}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Painel: Comparativo de Preços ─────────────────────────────────────────────

function PanelComparativo({
  equalization, filters,
}: {
  equalization: EqualizationResponse
  filters: Filters
}) {
  const [sortCol, setSortCol] = useState<string>('numero_item')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const visibleProposals = equalization.proposals.filter(
    (p) => filters.fornecedores.length === 0 || filters.fornecedores.includes(String(p.id))
  )

  const filteredItems = equalization.items.filter((item) => {
    if (filters.categoria && item.categoria !== filters.categoria) return false
    if (filters.disciplina && item.disciplina !== filters.disciplina) return false
    return true
  })

  const sorted = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let va: number | string = a.numero_item
      let vb: number | string = b.numero_item
      if (sortCol === 'descricao') { va = a.descricao; vb = b.descricao }
      else if (sortCol === 'ref') { va = a.preco_referencia ?? 0; vb = b.preco_referencia ?? 0 }
      else if (sortCol === 'media') { va = a.preco_medio ?? 0; vb = b.preco_medio ?? 0 }
      else if (sortCol === 'stddev') { va = a.desvio_padrao ?? 0; vb = b.desvio_padrao ?? 0 }
      const r = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sortDir === 'asc' ? r : -r
    })
  }, [filteredItems, sortCol, sortDir])

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ChevronUp size={10} className="text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp size={10} className="text-blue-600" /> : <ChevronDown size={10} className="text-blue-600" />
  }

  if (!equalization.proposals.length || !equalization.items.length) {
    return <EmptyState message="Adicione propostas e insira preços para visualizar o comparativo." />
  }

  // Ranking resumo
  const rankSorted = [...equalization.proposals].sort((a, b) => a.valor_total - b.valor_total)
  const maxTotal = Math.max(...rankSorted.map((p) => p.valor_total))

  return (
    <div className="space-y-6">
      {/* Ranking */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ranking por Valor Total</h3>
        <div className="space-y-2.5">
          {rankSorted.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i === 0 ? 'bg-green-500 text-white' : i === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 truncate">{p.empresa}</span>
                  <span className="text-sm font-bold text-gray-900 ml-3 flex-shrink-0">{formatBRL(p.valor_total)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${i === 0 ? 'bg-green-500' : 'bg-blue-400'}`}
                    style={{ width: `${(p.valor_total / maxTotal) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Tabela detalhada */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Preços Unitários — {sorted.length} itens
          </h3>
          <span className="text-xs text-gray-400">Verde = abaixo ref · Vermelho = acima ref +20%</span>
        </div>
        <div className="overflow-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="px-3 py-2.5 text-left font-semibold text-gray-600 cursor-pointer whitespace-nowrap sticky left-0 bg-gray-50 z-10"
                  onClick={() => toggleSort('numero_item')}
                >
                  <div className="flex items-center gap-1">Item <SortIcon col="numero_item" /></div>
                </th>
                <th
                  className="px-3 py-2.5 text-left font-semibold text-gray-600 cursor-pointer whitespace-nowrap"
                  onClick={() => toggleSort('descricao')}
                >
                  <div className="flex items-center gap-1">Descrição <SortIcon col="descricao" /></div>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">Un</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">Qtd</th>
                <th
                  className="px-3 py-2.5 text-right font-semibold text-gray-600 cursor-pointer whitespace-nowrap bg-blue-50"
                  onClick={() => toggleSort('ref')}
                >
                  <div className="flex items-center justify-end gap-1">P. Ref. <SortIcon col="ref" /></div>
                </th>
                <th
                  className="px-3 py-2.5 text-right font-semibold text-gray-600 cursor-pointer whitespace-nowrap"
                  onClick={() => toggleSort('media')}
                >
                  <div className="flex items-center justify-end gap-1">Média <SortIcon col="media" /></div>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">Mín</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap">Máx</th>
                <th
                  className="px-3 py-2.5 text-right font-semibold text-gray-600 cursor-pointer whitespace-nowrap"
                  onClick={() => toggleSort('stddev')}
                >
                  <div className="flex items-center justify-end gap-1">σ <SortIcon col="stddev" /></div>
                </th>
                {visibleProposals.map((p) => (
                  <th key={p.id} className="px-3 py-2.5 text-right font-semibold text-gray-600 whitespace-nowrap max-w-[100px]">
                    <div className="truncate" title={p.empresa}>{p.empresa}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => (
                <tr key={item.pq_item_id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30`}>
                  <td className="px-3 py-2 font-mono text-gray-500 sticky left-0 bg-inherit">{item.numero_item}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                    <div className="truncate" title={item.descricao}>{item.descricao}</div>
                    {(item.categoria || item.disciplina) && (
                      <div className="text-[10px] text-gray-400 truncate">{[item.categoria, item.disciplina].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">{item.unidade}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatNumber(item.quantidade, 0)}</td>
                  <td className="px-3 py-2 text-right font-medium text-blue-700 bg-blue-50/50">
                    {formatBRL(item.preco_referencia)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{formatBRL(item.preco_medio)}</td>
                  <td className="px-3 py-2 text-right text-green-700">{formatBRL(item.preco_minimo)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{formatBRL(item.preco_maximo)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{item.desvio_padrao != null ? formatNumber(item.desvio_padrao) : '—'}</td>
                  {visibleProposals.map((p) => {
                    const price = item.precos[String(p.id)]
                    const pct = price != null ? pctDiff(price, item.preco_referencia) : null
                    const isMin = price != null && price === item.preco_minimo
                    return (
                      <td
                        key={p.id}
                        className={`px-3 py-2 text-right whitespace-nowrap ${
                          price == null ? 'text-gray-200' :
                          isMin ? 'bg-green-50 text-green-700 font-semibold' :
                          pct != null && pct > 20 ? 'bg-red-50 text-red-600' :
                          pct != null && pct > 5 ? 'bg-amber-50 text-amber-700' : 'text-gray-700'
                        }`}
                      >
                        {price == null ? '—' : (
                          <div>
                            {formatBRL(price)}
                            <div>{pctBadge(pct)}</div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Painel: Cherry Picking ────────────────────────────────────────────────────

function PanelCherryPicking({
  equalization, filters,
}: {
  equalization: EqualizationResponse
  filters: Filters
}) {
  const proposals = equalization.proposals

  const filteredItems = equalization.items.filter((item) => {
    if (filters.categoria && item.categoria !== filters.categoria) return false
    if (filters.disciplina && item.disciplina !== filters.disciplina) return false
    return true
  })

  // For each item: find who offers minimum price
  const cherryRows = filteredItems.map((item) => {
    let minPrice: number | null = null
    let minSupplier: string | null = null
    let minPropId: string | null = null

    for (const p of proposals) {
      const price = item.precos[String(p.id)]
      if (price != null && (minPrice === null || price < minPrice)) {
        minPrice = price
        minSupplier = p.empresa
        minPropId = String(p.id)
      }
    }

    const qty = item.quantidade ?? 0
    const cherryTotal = minPrice != null ? minPrice * qty : null
    const refTotal = item.preco_referencia != null ? item.preco_referencia * qty : null
    const savings = cherryTotal != null && refTotal != null ? refTotal - cherryTotal : null
    const savingsPct = savings != null && refTotal ? (savings / refTotal) * 100 : null

    return { item, minPrice, minSupplier, minPropId, cherryTotal, refTotal, savings, savingsPct }
  })

  // Supplier cherry pick count & total
  const supplierStats: Record<string, { count: number; total: number }> = {}
  let grandCherryTotal = 0
  let grandRefTotal = 0
  let grandSavings = 0

  for (const row of cherryRows) {
    if (row.minSupplier) {
      supplierStats[row.minSupplier] ??= { count: 0, total: 0 }
      supplierStats[row.minSupplier].count++
      supplierStats[row.minSupplier].total += row.cherryTotal ?? 0
    }
    grandCherryTotal += row.cherryTotal ?? 0
    grandRefTotal += row.refTotal ?? 0
    grandSavings += row.savings ?? 0
  }

  // Actual total (lowest total proposal)
  const proposalTotals = [...proposals].sort((a, b) => a.valor_total - b.valor_total)
  const lowestTotal = proposalTotals[0]?.valor_total ?? 0
  const additionalSavings = lowestTotal - grandCherryTotal

  if (!proposals.length || !equalization.items.length) {
    return <EmptyState message="Adicione propostas e insira preços para ver o cherry picking." />
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total cherry picking</p>
          <p className="text-xl font-bold text-gray-900">{formatBRL(grandCherryTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">melhor preço por item</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total referência</p>
          <p className="text-xl font-bold text-gray-900">{formatBRL(grandRefTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">preço de referência (PQ)</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 mb-1">Economia vs referência</p>
          <p className="text-xl font-bold text-green-700">{formatBRL(grandSavings)}</p>
          <p className="text-xs text-green-500 mt-0.5">
            {grandRefTotal ? formatPercent((grandSavings / grandRefTotal) * 100) : '—'} de redução
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 mb-1">Economia vs menor proposta</p>
          <p className="text-xl font-bold text-blue-700">{formatBRL(additionalSavings)}</p>
          <p className="text-xs text-blue-500 mt-0.5">
            vs {proposalTotals[0]?.empresa ?? '—'}
          </p>
        </div>
      </div>

      {/* Quem vence por item */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vencedor por item</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(supplierStats)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name, stats]) => (
              <div key={name} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                <Trophy size={13} className="text-amber-500" />
                <span className="text-sm font-semibold text-gray-800">{name}</span>
                <span className="text-xs text-gray-400">{stats.count} itens</span>
                <span className="text-xs font-medium text-blue-700">{formatBRL(stats.total)}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs border-collapse min-w-max">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Item</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Descrição</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Qtd</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600 bg-blue-50">P. Ref.</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600 bg-blue-50">Total Ref.</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 bg-green-50">Melhor Fornecedor</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600 bg-green-50">Melhor Preço</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600 bg-green-50">Total Cherry</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Economia</th>
              <th className="px-3 py-2.5 text-right font-semibold text-gray-600">%</th>
            </tr>
          </thead>
          <tbody>
            {cherryRows.map(({ item, minPrice, minSupplier, cherryTotal, refTotal, savings, savingsPct }, idx) => (
              <tr key={item.pq_item_id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/20`}>
                <td className="px-3 py-2 font-mono text-gray-500">{item.numero_item}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                  <div className="truncate" title={item.descricao}>{item.descricao}</div>
                </td>
                <td className="px-3 py-2 text-right text-gray-600">{formatNumber(item.quantidade, 0)}</td>
                <td className="px-3 py-2 text-right text-blue-700 bg-blue-50/40">{formatBRL(item.preco_referencia)}</td>
                <td className="px-3 py-2 text-right text-blue-700 bg-blue-50/40">{formatBRL(refTotal)}</td>
                <td className="px-3 py-2 text-green-700 font-medium bg-green-50/40">
                  {minSupplier ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right text-green-700 font-semibold bg-green-50/40">{formatBRL(minPrice)}</td>
                <td className="px-3 py-2 text-right text-green-700 font-semibold bg-green-50/40">{formatBRL(cherryTotal)}</td>
                <td className="px-3 py-2 text-right">
                  {savings != null && savings > 0 ? (
                    <span className="text-green-700 font-medium">{formatBRL(savings)}</span>
                  ) : savings != null && savings < 0 ? (
                    <span className="text-red-600">{formatBRL(savings)}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right">{pctBadge(savingsPct)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
              <td colSpan={4} className="px-3 py-2.5 text-sm text-gray-700">Total</td>
              <td className="px-3 py-2.5 text-right text-blue-700">{formatBRL(grandRefTotal)}</td>
              <td colSpan={2} />
              <td className="px-3 py-2.5 text-right text-green-700">{formatBRL(grandCherryTotal)}</td>
              <td className="px-3 py-2.5 text-right text-green-700">{formatBRL(grandSavings)}</td>
              <td className="px-3 py-2.5 text-right">
                {grandRefTotal ? pctBadge((grandSavings / grandRefTotal) * 100) : null}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Painel: Por Fornecedor ────────────────────────────────────────────────────

function PanelFornecedores({
  equalization, filters,
}: {
  equalization: EqualizationResponse
  filters: Filters
}) {
  const proposals = equalization.proposals.filter(
    (p) => filters.fornecedores.length === 0 || filters.fornecedores.includes(String(p.id))
  )

  const filteredItems = equalization.items.filter((item) => {
    if (filters.categoria && item.categoria !== filters.categoria) return false
    if (filters.disciplina && item.disciplina !== filters.disciplina) return false
    return true
  })

  const totalItems = filteredItems.length

  const stats = proposals.map((p) => {
    let itemsPreenchidos = 0
    let itemsFaltando = 0
    let itemsAcimaDe20 = 0
    let somaDesvios = 0
    let countDesvios = 0

    for (const item of filteredItems) {
      const price = item.precos[String(p.id)]
      if (price == null) { itemsFaltando++; continue }
      itemsPreenchidos++
      const pct = pctDiff(price, item.preco_referencia)
      if (pct !== null) {
        somaDesvios += pct
        countDesvios++
        if (pct > 20) itemsAcimaDe20++
      }
    }

    const avgDesvio = countDesvios > 0 ? somaDesvios / countDesvios : null
    const coveragePercent = totalItems > 0 ? (itemsPreenchidos / totalItems) * 100 : 0

    return { proposal: p, itemsPreenchidos, itemsFaltando, itemsAcimaDe20, avgDesvio, coveragePercent }
  })

  const ranked = [...stats].sort((a, b) => (a.avgDesvio ?? Infinity) - (b.avgDesvio ?? Infinity))

  if (!proposals.length) {
    return <EmptyState message="Adicione propostas para ver a análise por fornecedor." />
  }

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ranked.map((s, i) => (
          <div key={s.proposal.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{i + 1}</span>
                <span className="text-sm font-semibold text-gray-800 truncate">{s.proposal.empresa}</span>
              </div>
              {i === 0 && <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">Melhor desvio</span>}
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {/* Cobertura */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Cobertura de itens</span>
                  <span className="text-xs font-semibold text-gray-700">{s.itemsPreenchidos}/{totalItems}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.coveragePercent}%` }} />
                </div>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-800">{formatBRL(s.proposal.valor_total)}</p>
                  <p className="text-[10px] text-gray-400">Valor total</p>
                </div>
                <div className={`rounded-lg p-2 ${
                  s.avgDesvio === null ? 'bg-gray-50' :
                  s.avgDesvio > 20 ? 'bg-red-50' : s.avgDesvio > 5 ? 'bg-amber-50' : 'bg-green-50'
                }`}>
                  <p className={`text-lg font-bold ${
                    s.avgDesvio === null ? 'text-gray-400' :
                    s.avgDesvio > 20 ? 'text-red-600' : s.avgDesvio > 5 ? 'text-amber-600' : 'text-green-700'
                  }`}>
                    {s.avgDesvio !== null ? `${s.avgDesvio > 0 ? '+' : ''}${s.avgDesvio.toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-[10px] text-gray-400">Desvio médio</p>
                </div>
                <div className={`rounded-lg p-2 ${s.itemsAcimaDe20 > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-lg font-bold ${s.itemsAcimaDe20 > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {s.itemsAcimaDe20}
                  </p>
                  <p className="text-[10px] text-gray-400">Acima +20%</p>
                </div>
              </div>
              {/* Itens faltando */}
              {s.itemsFaltando > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                  <AlertTriangle size={11} />
                  {s.itemsFaltando} {s.itemsFaltando === 1 ? 'item sem preço' : 'itens sem preço'}
                </div>
              )}
              {s.itemsFaltando === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-2 py-1.5">
                  <CheckCircle size={11} />
                  Proposta completa
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela comparativa de desvios */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Desvio por item × fornecedor</h3>
        <div className="overflow-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Item</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Descrição</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 bg-blue-50">Ref.</th>
                {proposals.map((p) => (
                  <th key={p.id} className="px-3 py-2.5 text-right font-semibold text-gray-600 max-w-[100px]">
                    <div className="truncate" title={p.empresa}>{p.empresa}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.slice(0, 100).map((item, idx) => (
                <tr key={item.pq_item_id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-1.5 font-mono text-gray-500">{item.numero_item}</td>
                  <td className="px-3 py-1.5 text-gray-700 max-w-[180px]">
                    <div className="truncate" title={item.descricao}>{item.descricao}</div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-blue-700 bg-blue-50/40">{formatBRL(item.preco_referencia)}</td>
                  {proposals.map((p) => {
                    const price = item.precos[String(p.id)]
                    const pct = price != null ? pctDiff(price, item.preco_referencia) : null
                    return (
                      <td key={p.id} className={`px-3 py-1.5 text-right ${
                        price == null ? 'text-gray-200' :
                        pct != null && pct > 20 ? 'bg-red-50 text-red-600' :
                        pct != null && pct > 5 ? 'bg-amber-50 text-amber-700' :
                        'text-gray-700'
                      }`}>
                        {price == null ? '—' : pctBadge(pct)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length > 100 && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
              Exibindo 100 de {filteredItems.length} itens. Use filtros para refinar.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Painel: Distribuição ──────────────────────────────────────────────────────

function PanelDistribuicao({
  disciplines, categorias,
}: {
  disciplines: DisciplineSummary[]
  categorias: CategoriaSummary[]
}) {
  if (disciplines.length === 0 && categorias.length === 0) {
    return <EmptyState message="Cadastre disciplinas e categorias nos itens da Planilha PQ." />
  }
  return (
    <div className="space-y-8">
      <DisciplineChart data={disciplines} nameKey="disciplina" title="Distribuição por Disciplina (R$)" />
      {categorias.length > 0 && (
        <>
          <hr className="border-gray-100" />
          <DisciplineChart data={categorias} nameKey="categoria" title="Distribuição por Categoria (R$)" />
        </>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Analytics() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const [tab, setTab] = useState<Tab>('pareto')
  const [source, setSource] = useState<'referencia' | 'propostas'>('referencia')
  const [filters, setFilters] = useState<Filters>({ categoria: '', disciplina: '', fornecedores: [] })
  const [exporting, setExporting] = useState(false)


  const { data: project } = useQuery({
    queryKey: ['project', pid],
    queryFn: () => projectsAPI.get(pid).then((r) => r.data),
  })

  const { data: paretoData, isLoading: loadingPareto } = useQuery<ParetoData>({
    queryKey: ['pareto', pid, source],
    queryFn: () => analyticsAPI.getPareto(pid, source).then((r) => r.data),
  })

  const { data: equalization, isLoading: loadingEq } = useQuery<EqualizationResponse>({
    queryKey: ['equalization', pid],
    queryFn: () => analyticsAPI.getEqualization(pid).then((r) => r.data),
  })

  const { data: _rawDisciplines } = useQuery<DisciplineSummary[]>({
    queryKey: ['disciplines', pid],
    queryFn: () => analyticsAPI.getDisciplines(pid).then((r) => r.data),
  })
  const disciplines: DisciplineSummary[] = Array.isArray(_rawDisciplines) ? _rawDisciplines : []

  const { data: _rawCategorias } = useQuery<CategoriaSummary[]>({
    queryKey: ['categorias', pid],
    queryFn: () => analyticsAPI.getCategorias(pid).then((r) => r.data),
  })
  const categorias: CategoriaSummary[] = Array.isArray(_rawCategorias) ? _rawCategorias : []

  // Build filter options from data
  const categoriasOpts = useMemo(() => {
    const s = new Set<string>()
    equalization?.items.forEach((i) => { if (i.categoria) s.add(i.categoria) })
    return [...s].sort()
  }, [equalization])

  const disciplinasOpts = useMemo(() => {
    const s = new Set<string>()
    equalization?.items.forEach((i) => { if (i.disciplina) s.add(i.disciplina) })
    return [...s].sort()
  }, [equalization])

  async function handleExport() {
    setExporting(true)
    try {
      const res = await analyticsAPI.exportExcel(pid)
      downloadBlob(res.data, `equalizacao_${project?.nome ?? pid}.xlsx`)
      toast.success('Relatório exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar relatório')
    } finally {
      setExporting(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'pareto', label: 'Curva ABC / Pareto', icon: TrendingUp },
    { id: 'comparativo', label: 'Comparativo', icon: GitCompare },
    { id: 'cherry', label: 'Cherry Picking', icon: Sparkles },
    { id: 'fornecedores', label: 'Por Fornecedor', icon: Users },
    { id: 'distribuicao', label: 'Distribuição', icon: PieChart },
  ]

  const showFilterPanel = ['comparativo', 'cherry', 'fornecedores'].includes(tab)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/projetos" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-xs text-gray-400">{project?.nome}</p>
              <h1 className="text-xl font-bold text-gray-900">Análises</h1>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            <Download size={14} className={exporting ? 'animate-bounce' : ''} />
            {exporting ? 'Exportando…' : 'Exportar Excel'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl mb-6 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Source toggle (ABC/Pareto only) */}
        {tab === 'pareto' && (
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm text-gray-600 font-medium">Base de preços:</span>
            <div className="flex gap-1 bg-white border border-gray-200 p-0.5 rounded-lg">
              {(['referencia', 'propostas'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    source === s ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s === 'referencia' ? 'Preço de Referência' : 'Média das Propostas'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className={`${showFilterPanel ? 'flex gap-6 items-start' : ''}`}>

          {/* Filter panel */}
          {showFilterPanel && (
            <div className="w-52 flex-shrink-0">
              <FilterBar
                filters={filters}
                setFilters={setFilters}
                proposals={equalization?.proposals ?? []}
                categorias={categoriasOpts}
                disciplinas={disciplinasOpts}
              />
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-6">

            {/* ── PARETO / ABC ── */}
            {tab === 'pareto' && (
              <div className="space-y-8">
                {loadingPareto ? <Loading /> : !paretoData?.items.length ? (
                  <EmptyState message="Cadastre preços de referência na Planilha PQ para visualizar o Pareto." />
                ) : (
                  <>
                    {/* ABC Summary badges */}
                    <div className="flex gap-4 flex-wrap">
                      {(['A', 'B', 'C'] as const).map((cls) => {
                        const count = cls === 'A' ? paretoData.count_a : cls === 'B' ? paretoData.count_b : paretoData.count_c
                        const valor = cls === 'A' ? paretoData.valor_a : cls === 'B' ? paretoData.valor_b : paretoData.valor_c
                        const colors = { A: 'border-green-300 bg-green-50 text-green-800', B: 'border-amber-300 bg-amber-50 text-amber-800', C: 'border-gray-300 bg-gray-50 text-gray-700' }
                        return (
                          <div key={cls} className={`border rounded-xl px-4 py-3 ${colors[cls]}`}>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold">Classe {cls}</span>
                              <span className="text-sm font-medium">{count} itens</span>
                            </div>
                            <p className="text-sm font-semibold mt-0.5">{formatBRL(Number(valor))}</p>
                          </div>
                        )
                      })}
                    </div>

                    <ParetoChart items={paretoData.items} />

                    <div>
                      <ABCCurveChart data={paretoData} />
                    </div>

                    {/* ABC Table */}
                    <div className="overflow-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Pos.</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Item</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Descrição</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Categoria</th>
                            <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Qtd</th>
                            <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Preço Médio</th>
                            <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Valor Total</th>
                            <th className="px-3 py-2.5 text-right font-semibold text-gray-600">%</th>
                            <th className="px-3 py-2.5 text-right font-semibold text-gray-600">% Acum.</th>
                            <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Classe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paretoData.items.map((item, idx) => (
                            <tr key={item.pq_item_id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-3 py-2 text-gray-400">{item.posicao}</td>
                              <td className="px-3 py-2 font-mono text-gray-500">{item.numero_item}</td>
                              <td className="px-3 py-2 text-gray-700 max-w-[240px]">
                                <div className="truncate" title={item.descricao}>{item.descricao}</div>
                              </td>
                              <td className="px-3 py-2 text-gray-400">{item.categoria ?? '—'}</td>
                              <td className="px-3 py-2 text-right">{formatNumber(item.quantidade, 0)}</td>
                              <td className="px-3 py-2 text-right">{formatBRL(Number(item.preco_medio))}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatBRL(Number(item.valor_total))}</td>
                              <td className="px-3 py-2 text-right">{formatPercent(item.percentual)}</td>
                              <td className="px-3 py-2 text-right">{formatPercent(item.percentual_acumulado)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`badge-${item.classe.toLowerCase()}`}>{item.classe}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── COMPARATIVO ── */}
            {tab === 'comparativo' && (
              loadingEq ? <Loading /> :
              equalization ? <PanelComparativo equalization={equalization} filters={filters} /> :
              <EmptyState message="Adicione propostas para visualizar o comparativo." />
            )}

            {/* ── CHERRY PICKING ── */}
            {tab === 'cherry' && (
              loadingEq ? <Loading /> :
              equalization ? <PanelCherryPicking equalization={equalization} filters={filters} /> :
              <EmptyState message="Adicione propostas para ver o cherry picking." />
            )}

            {/* ── POR FORNECEDOR ── */}
            {tab === 'fornecedores' && (
              loadingEq ? <Loading /> :
              equalization ? <PanelFornecedores equalization={equalization} filters={filters} /> :
              <EmptyState message="Adicione propostas para ver a análise por fornecedor." />
            )}

            {/* ── DISTRIBUIÇÃO ── */}
            {tab === 'distribuicao' && (
              <PanelDistribuicao disciplines={disciplines} categorias={categorias} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
