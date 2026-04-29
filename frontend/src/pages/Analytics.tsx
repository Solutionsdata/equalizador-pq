import React, { useMemo, useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { analyticsAPI, revisionsAPI, projectsAPI, downloadBlob } from '../services/api'
import type {
  ParetoData, EqualizationResponse, DisciplineSummary, CategoriaSummary, LocalidadeSummary,
  EqualizationProposal, ScopeValidationResponse, RevisionCompareResponse, ProjectRevision,
} from '../types'
import { formatBRL, formatPercent, formatNumber } from '../types'
import ParetoChart from '../components/Charts/ParetoChart'
import ABCCurveChart from '../components/Charts/ABCCurveChart'
import DisciplineChart from '../components/Charts/DisciplineChart'
import {
  ArrowLeft, BarChart3, TrendingUp, GitCompare,
  Sparkles, Users, Download, Filter, X,
  ChevronUp, ChevronDown, Trophy, AlertTriangle, CheckCircle,
  PieChart, ShieldCheck, GitBranch, MapPin,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'pareto' | 'comparativo' | 'cherry' | 'fornecedores' | 'distribuicao' | 'escopo' | 'revisoes'

interface Filters {
  categoria: string
  disciplina: string
  localidade: string
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
  filters, setFilters, proposals, categorias, disciplinas, localidades,
}: {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  proposals: EqualizationProposal[]
  categorias: string[]
  disciplinas: string[]
  localidades: string[]
}) {
  const hasActive = filters.categoria || filters.disciplina || filters.localidade || filters.fornecedores.length > 0
  const activeCount = [filters.categoria, filters.disciplina, filters.localidade].filter(Boolean).length
    + (filters.fornecedores.length > 0 ? 1 : 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 sticky top-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={14} /> Filtros
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {hasActive && (
          <button
            onClick={() => setFilters({ categoria: '', disciplina: '', localidade: '', fornecedores: [] })}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <X size={11} /> Limpar
          </button>
        )}
      </div>

      {/* Localidade */}
      {localidades.length > 0 && (
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <MapPin size={10} /> Localidade
          </label>
          <select
            value={filters.localidade}
            onChange={(e) => setFilters((f) => ({ ...f, localidade: e.target.value }))}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Todas</option>
            {localidades.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      )}

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
                  {p.is_winner && <span className="text-[9px] text-amber-600 font-bold ml-auto flex-shrink-0">★</span>}
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
    if (filters.localidade && item.localidade !== filters.localidade) return false
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
                    {(item.localidade || item.categoria || item.disciplina) && (
                      <div className="text-[10px] text-gray-400 truncate">
                        {[item.localidade, item.categoria, item.disciplina].filter(Boolean).join(' · ')}
                      </div>
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
    if (filters.localidade && item.localidade !== filters.localidade) return false
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
    if (filters.localidade && item.localidade !== filters.localidade) return false
    return true
  })

  const totalItems = filteredItems.length

  // Médias das propostas por item (referência)
  const mediaTotal = filteredItems.reduce((acc, item) => acc + (Number(item.preco_medio) || 0) * item.quantidade, 0)

  // cherry pick wins per supplier
  const cherryWins: Record<string, number> = {}
  for (const item of filteredItems) {
    let minPrice: number | null = null
    let minId: string | null = null
    for (const p of proposals) {
      const price = item.precos[String(p.id)]
      if (price != null && (minPrice === null || price < minPrice)) { minPrice = price; minId = String(p.id) }
    }
    if (minId) cherryWins[minId] = (cherryWins[minId] ?? 0) + 1
  }

  const stats = proposals.map((p) => {
    let itemsPreenchidos = 0
    let itemsFaltando = 0
    let itemsAcimaDaMedia = 0
    let itemsAbaixoMedia = 0
    let somaDesvios = 0
    let countDesvios = 0
    let itemsDescDiff = 0
    let itemsUnidDiff = 0
    let itemsQtdDiff = 0

    for (const item of filteredItems) {
      const price = item.precos[String(p.id)]
      if (price == null) { itemsFaltando++; continue }
      itemsPreenchidos++
      const pct = pctDiff(price, item.preco_medio ?? undefined)
      if (pct !== null) {
        somaDesvios += pct
        countDesvios++
        if (pct > 10) itemsAcimaDaMedia++
        if (pct < -10) itemsAbaixoMedia++
      }
    }

    const avgDesvio = countDesvios > 0 ? somaDesvios / countDesvios : null
    const coveragePercent = totalItems > 0 ? (itemsPreenchidos / totalItems) * 100 : 0
    const itemsMinPreco = cherryWins[String(p.id)] ?? 0
    const propTotal = p.valor_total
    const diffVsMedia = mediaTotal > 0 ? ((propTotal - mediaTotal) / mediaTotal) * 100 : null

    return {
      proposal: p, itemsPreenchidos, itemsFaltando, itemsAcimaDaMedia, itemsAbaixoMedia,
      avgDesvio, coveragePercent, itemsMinPreco, propTotal, diffVsMedia,
      itemsDescDiff, itemsUnidDiff, itemsQtdDiff,
    }
  })

  const ranked = [...stats].sort((a, b) => (a.avgDesvio ?? Infinity) - (b.avgDesvio ?? Infinity))

  if (!proposals.length) {
    return <EmptyState message="Adicione propostas para ver a análise por fornecedor." />
  }

  const melhorTotal = Math.min(...proposals.map((p) => p.valor_total))

  return (
    <div className="space-y-6">
      {/* Texto explicativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800 space-y-1.5">
        <p className="font-semibold text-blue-900">Análise Comparativa por Fornecedor</p>
        <p>
          O desvio é calculado em relação à <strong>média das propostas</strong> para cada item —
          não ao preço de referência da PQ. Isso permite identificar quais fornecedores estão sistematicamente
          acima ou abaixo do mercado nesta concorrência.
        </p>
        <p className="text-xs text-blue-600">
          {proposals.length} proponente{proposals.length !== 1 ? 's' : ''} · {totalItems} itens analisados ·
          Média total das propostas: <strong>{formatBRL(mediaTotal)}</strong> ·
          Menor proposta: <strong>{formatBRL(melhorTotal)}</strong>
        </p>
      </div>

      {/* Cards por fornecedor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ranked.map((s, i) => (
          <div key={s.proposal.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Cabeçalho do card */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-green-500 text-white' : i === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>{i + 1}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{s.proposal.empresa}</p>
                  <p className="text-[10px] text-gray-400">BDI global: {s.proposal.bdi_global.toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {i === 0 && <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded px-2 py-0.5">Menor desvio</span>}
                {s.proposal.valor_total === melhorTotal && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">Menor total</span>}
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Valor total + desvio vs média */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatBRL(s.propTotal)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Valor total da proposta</p>
                </div>
                {s.diffVsMedia !== null && (
                  <div className={`text-right px-3 py-2 rounded-xl ${
                    s.diffVsMedia > 5 ? 'bg-red-50 text-red-700' :
                    s.diffVsMedia < -5 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    <p className="text-base font-bold">{s.diffVsMedia > 0 ? '+' : ''}{s.diffVsMedia.toFixed(1)}%</p>
                    <p className="text-[10px] font-medium">vs média</p>
                  </div>
                )}
              </div>

              {/* Cobertura */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500 font-medium">Cobertura de itens</span>
                  <span className="text-xs font-semibold text-gray-700">{s.itemsPreenchidos}/{totalItems} ({s.coveragePercent.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.coveragePercent === 100 ? 'bg-green-500' : s.coveragePercent > 80 ? 'bg-blue-500' : 'bg-amber-400'}`}
                    style={{ width: `${s.coveragePercent}%` }} />
                </div>
              </div>

              {/* Grade de métricas */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className={`rounded-xl p-2.5 ${
                  s.avgDesvio === null ? 'bg-gray-50' : Math.abs(s.avgDesvio) < 5 ? 'bg-green-50' : s.avgDesvio > 10 ? 'bg-red-50' : 'bg-amber-50'
                }`}>
                  <p className={`text-base font-bold ${
                    s.avgDesvio === null ? 'text-gray-400' : Math.abs(s.avgDesvio) < 5 ? 'text-green-700' : s.avgDesvio > 10 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {s.avgDesvio !== null ? `${s.avgDesvio > 0 ? '+' : ''}${s.avgDesvio.toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-[9px] text-gray-400 leading-tight mt-0.5">Desv. médio</p>
                </div>
                <div className={`rounded-xl p-2.5 ${s.itemsAcimaDaMedia > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-base font-bold ${s.itemsAcimaDaMedia > 0 ? 'text-red-600' : 'text-gray-400'}`}>{s.itemsAcimaDaMedia}</p>
                  <p className="text-[9px] text-gray-400 leading-tight mt-0.5">+10% média</p>
                </div>
                <div className={`rounded-xl p-2.5 ${s.itemsAbaixoMedia > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className={`text-base font-bold ${s.itemsAbaixoMedia > 0 ? 'text-green-700' : 'text-gray-400'}`}>{s.itemsAbaixoMedia}</p>
                  <p className="text-[9px] text-gray-400 leading-tight mt-0.5">-10% média</p>
                </div>
                <div className={`rounded-xl p-2.5 ${s.itemsMinPreco > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <p className={`text-base font-bold ${s.itemsMinPreco > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{s.itemsMinPreco}</p>
                  <p className="text-[9px] text-gray-400 leading-tight mt-0.5">Mín. preço</p>
                </div>
              </div>

              {/* Status de itens */}
              {s.itemsFaltando > 0 ? (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} />
                  {s.itemsFaltando} {s.itemsFaltando === 1 ? 'item sem preço' : 'itens sem preço'} — proposta incompleta
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                  <CheckCircle size={12} />
                  Proposta completa — todos os {totalItems} itens preenchidos
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela comparativa vs média */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Preço unitário × Média das Propostas (desvio em %)
        </h3>
        <div className="overflow-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Item</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Descrição</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 bg-blue-50">Ref. PQ</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 bg-purple-50">Média</th>
                {proposals.map((p) => (
                  <th key={p.id} className="px-3 py-2.5 text-right font-semibold text-gray-600 max-w-[110px]">
                    <div className="truncate" title={p.empresa}>{p.empresa}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.slice(0, 100).map((item, idx) => (
                <tr key={item.pq_item_id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-1.5 font-mono text-gray-500 whitespace-nowrap">{item.numero_item}</td>
                  <td className="px-3 py-1.5 text-gray-700 max-w-[180px]">
                    <div className="truncate" title={item.descricao}>{item.descricao}</div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-blue-700 bg-blue-50/40 whitespace-nowrap">{formatBRL(item.preco_referencia)}</td>
                  <td className="px-3 py-1.5 text-right text-purple-700 bg-purple-50/40 font-medium whitespace-nowrap">{formatBRL(item.preco_medio)}</td>
                  {proposals.map((p) => {
                    const price = item.precos[String(p.id)]
                    const pct = price != null ? pctDiff(price, item.preco_medio ?? undefined) : null
                    return (
                      <td key={p.id} className={`px-3 py-1.5 text-right whitespace-nowrap ${
                        price == null ? 'text-gray-200' :
                        pct != null && pct > 10 ? 'bg-red-50 text-red-600' :
                        pct != null && pct < -10 ? 'bg-green-50 text-green-700' :
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
  disciplines, categorias, localidades,
}: {
  disciplines: DisciplineSummary[]
  categorias: CategoriaSummary[]
  localidades: LocalidadeSummary[]
}) {
  if (disciplines.length === 0 && categorias.length === 0 && localidades.length === 0) {
    return <EmptyState message="Preencha disciplina, categoria ou localidade nos itens da Planilha PQ para ver a distribuição." />
  }

  // Totais consolidados do conjunto com mais dados
  const base = disciplines.length > 0 ? disciplines : categorias.length > 0 ? categorias : localidades
  const totalValor = base.reduce((s, d) => s + Number((d as any).valor_total), 0)
  const totalItens = base.reduce((s, d) => s + (d as any).count_items, 0)
  const precoMedio = totalItens > 0 ? totalValor / totalItens : 0

  const sections = [
    { show: localidades.length > 0, content: <DisciplineChart data={localidades} nameKey="localidade" title="Distribuição por Localidade (R$)" /> },
    { show: disciplines.length > 0, content: <DisciplineChart data={disciplines} nameKey="disciplina" title="Distribuição por Disciplina (R$)" /> },
    { show: categorias.length > 0, content: <DisciplineChart data={categorias} nameKey="categoria" title="Distribuição por Categoria (R$)" /> },
  ].filter((s) => s.show)

  return (
    <div className="space-y-8">
      {/* Card de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white rounded-xl px-5 py-4">
          <p className="text-xs font-medium opacity-75 mb-1">Valor Total (PQ)</p>
          <p className="text-2xl font-bold">{formatBRL(totalValor)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Total de Itens</p>
          <p className="text-2xl font-bold text-gray-900">{totalItens}</p>
          <p className="text-xs text-gray-400 mt-0.5">{base.length} grupos</p>
        </div>
        <div className="bg-white border border-purple-200 rounded-xl px-5 py-4">
          <p className="text-xs text-purple-500 font-medium mb-1">Preço Médio por Item</p>
          <p className="text-2xl font-bold text-purple-700">{formatBRL(precoMedio)}</p>
          <p className="text-xs text-gray-400 mt-0.5">referência interna</p>
        </div>
      </div>

      {sections.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <hr className="border-gray-100" />}
          {s.content}
        </React.Fragment>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Analytics() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const [tab, setTab] = useState<Tab>('pareto')
  const [source, setSource] = useState<'referencia' | 'propostas'>('referencia')
  const [filters, setFilters] = useState<Filters>({ categoria: '', disciplina: '', localidade: '', fornecedores: [] })
  const [exporting, setExporting] = useState(false)
  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', pid],
    queryFn: () => projectsAPI.get(pid).then((r) => r.data),
  })

  // Load revisions early — needed for revision selector
  const { data: revisionsAll } = useQuery<ProjectRevision[]>({
    queryKey: ['revisions', pid],
    queryFn: () => revisionsAPI.list(pid).then((r) => r.data),
  })
  const revisionsList: ProjectRevision[] = revisionsAll ?? []

  // Default to latest revision when revisions load
  useEffect(() => {
    if (revisionsList.length === 0) return
    const latestId = revisionsList.reduce((a, b) => (a.numero > b.numero ? a : b)).id
    setSelectedRevisionId((prev) => prev ?? latestId)
  }, [revisionsAll])

  const { data: paretoData, isLoading: loadingPareto } = useQuery<ParetoData>({
    queryKey: ['pareto', pid, source, selectedRevisionId],
    queryFn: () => analyticsAPI.getPareto(pid, source, selectedRevisionId).then((r) => r.data),
    enabled: selectedRevisionId !== null,
  })

  const { data: equalization, isLoading: loadingEq } = useQuery<EqualizationResponse>({
    queryKey: ['equalization', pid, selectedRevisionId],
    queryFn: () => analyticsAPI.getEqualization(pid, selectedRevisionId).then((r) => r.data),
    enabled: selectedRevisionId !== null,
  })

  const { data: _rawDisciplines } = useQuery<DisciplineSummary[]>({
    queryKey: ['disciplines', pid, selectedRevisionId],
    queryFn: () => analyticsAPI.getDisciplines(pid, selectedRevisionId).then((r) => r.data),
    enabled: selectedRevisionId !== null,
  })
  const disciplines: DisciplineSummary[] = Array.isArray(_rawDisciplines) ? _rawDisciplines : []

  const { data: _rawCategorias } = useQuery<CategoriaSummary[]>({
    queryKey: ['categorias', pid, selectedRevisionId],
    queryFn: () => analyticsAPI.getCategorias(pid, selectedRevisionId).then((r) => r.data),
    enabled: selectedRevisionId !== null,
  })
  const categorias: CategoriaSummary[] = Array.isArray(_rawCategorias) ? _rawCategorias : []

  const { data: _rawLocalidades } = useQuery<LocalidadeSummary[]>({
    queryKey: ['localidades', pid, selectedRevisionId],
    queryFn: () => analyticsAPI.getLocalidades(pid, selectedRevisionId).then((r) => r.data),
    enabled: selectedRevisionId !== null,
  })
  const localidades: LocalidadeSummary[] = Array.isArray(_rawLocalidades) ? _rawLocalidades : []

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

  const localidadesOpts = useMemo(() => {
    const s = new Set<string>()
    equalization?.items.forEach((i) => { if (i.localidade) s.add(i.localidade) })
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

  // ── Revision / Escopo state ───────────────────────────────────────────────
  const [revA, setRevA] = useState<number | ''>('')
  const [revB, setRevB] = useState<number | ''>('')
  const [compareTriggered, setCompareTriggered] = useState(false)

  // revisionsList is loaded above; alias for use in escopo/revisoes panels
  const revisions = revisionsList

  const { data: scopeData, isLoading: loadingScope } = useQuery<ScopeValidationResponse>({
    queryKey: ['scope-validation', pid],
    queryFn: () => revisionsAPI.scopeValidation(pid).then((r) => r.data),
    enabled: tab === 'escopo',
  })

  const { data: compareData, isLoading: loadingCompare } = useQuery<RevisionCompareResponse>({
    queryKey: ['revision-compare', pid, revA, revB],
    queryFn: () => revisionsAPI.compare(pid, revA as number, revB as number).then((r) => r.data),
    enabled: compareTriggered && revA !== '' && revB !== '',
  })

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'pareto', label: 'Curva ABC / Pareto', icon: TrendingUp },
    { id: 'comparativo', label: 'Comparativo', icon: GitCompare },
    { id: 'cherry', label: 'Cherry Picking', icon: Sparkles },
    { id: 'fornecedores', label: 'Por Fornecedor', icon: Users },
    { id: 'distribuicao', label: 'Distribuição', icon: PieChart },
    { id: 'escopo', label: 'Validação de Escopo', icon: ShieldCheck },
    { id: 'revisoes', label: 'Revisões', icon: GitBranch },
  ]

  const showFilterPanel = ['comparativo', 'cherry', 'fornecedores'].includes(tab)

  return (
    <div className="page">

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

        {/* Revision Selector */}
        {revisionsList.length > 1 && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
              <GitBranch size={14} className="text-blue-600" />
              Revisão analisada:
            </span>
            <div className="flex gap-1 bg-white border border-gray-200 p-0.5 rounded-xl">
              {[...revisionsList].sort((a, b) => a.numero - b.numero).map((rev) => (
                <button
                  key={rev.id}
                  onClick={() => { setSelectedRevisionId(rev.id); setFilters({ categoria: '', disciplina: '', localidade: '', fornecedores: [] }) }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedRevisionId === rev.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Rev. {rev.numero}{rev.descricao ? ` — ${rev.descricao}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

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
                localidades={localidadesOpts}
              />
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-6">

            {/* ── PARETO / ABC ── */}
            {tab === 'pareto' && (
              <div className="space-y-6">
                {loadingPareto ? <Loading /> : !paretoData?.items.length ? (
                  <EmptyState message="Cadastre preços de referência na Planilha PQ para visualizar o Pareto." />
                ) : (
                  <>
                    {/* Cards + Pizza lado a lado */}
                    <div className="flex gap-6 items-stretch">
                      {/* Cards de classe */}
                      <div className="flex flex-col gap-3 flex-shrink-0">
                        <div className="border-2 border-blue-300 bg-blue-600 text-white rounded-xl px-5 py-3 shadow-sm">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold">Total Geral</span>
                            <span className="text-sm font-medium opacity-80">{(paretoData.count_a + paretoData.count_b + paretoData.count_c)} itens</span>
                          </div>
                          <p className="text-xl font-bold mt-0.5 opacity-95">{formatBRL(Number(paretoData.total_valor))}</p>
                        </div>
                        {(['A', 'B', 'C'] as const).map((cls) => {
                          const count = cls === 'A' ? paretoData.count_a : cls === 'B' ? paretoData.count_b : paretoData.count_c
                          const valor = cls === 'A' ? paretoData.valor_a : cls === 'B' ? paretoData.valor_b : paretoData.valor_c
                          const styles = {
                            A: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800', accent: '#2563eb', pct: '~80%' },
                            B: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-800', accent: '#f59e0b', pct: '~15%' },
                            C: { border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-700', accent: '#10b981', pct: '~5%' },
                          }[cls]
                          const pct = Number(paretoData.total_valor) > 0
                            ? ((Number(valor) / Number(paretoData.total_valor)) * 100).toFixed(0)
                            : 0
                          return (
                            <div key={cls} className={`border-l-4 rounded-xl px-4 py-3 ${styles.border} ${styles.bg} ${styles.text}`} style={{ borderLeftColor: styles.accent }}>
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-bold">Classe {cls}</span>
                                <span className="text-sm font-medium">{count} itens</span>
                              </div>
                              <p className="text-sm font-semibold mt-0.5">{formatBRL(Number(valor))}</p>
                              <p className="text-xs opacity-60 mt-0.5">{pct}% do total</p>
                            </div>
                          )
                        })}
                      </div>
                      {/* Gráfico de pizza */}
                      <div className="flex-1 bg-white border border-gray-100 rounded-xl flex items-center justify-center py-2">
                        <ABCCurveChart data={paretoData} />
                      </div>
                    </div>

                    {/* Gráfico de Pareto */}
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <ParetoChart items={paretoData.items} />
                    </div>

                    {/* ABC Table */}
                    <div className="overflow-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Pos.</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Item</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Descrição</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Localidade</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Disciplina</th>
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
                              <td className="px-3 py-2 text-gray-400">{item.localidade ?? '—'}</td>
                              <td className="px-3 py-2 text-gray-400">{item.disciplina ?? '—'}</td>
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
              <PanelDistribuicao disciplines={disciplines} categorias={categorias} localidades={localidades} />
            )}

            {/* ── VALIDAÇÃO DE ESCOPO ── */}
            {tab === 'escopo' && (
              loadingScope ? <Loading /> : !scopeData ? (
                <EmptyState message="Nenhuma revisão encontrada. Crie uma revisão para validar o escopo." />
              ) : (() => {
                const allProposals = scopeData.proposals
                const withChanges = allProposals.filter((p: any) => p.has_changes)
                const totalChanges = withChanges.reduce((acc: number, p: any) => acc + p.changes.length, 0)
                const descChanges = withChanges.reduce((acc: number, p: any) =>
                  acc + p.changes.filter((c: any) => c.changed_fields.includes('descricao')).length, 0)
                const unidChanges = withChanges.reduce((acc: number, p: any) =>
                  acc + p.changes.filter((c: any) => c.changed_fields.includes('unidade')).length, 0)
                const qtdChanges = withChanges.reduce((acc: number, p: any) =>
                  acc + p.changes.filter((c: any) => c.changed_fields.includes('quantidade')).length, 0)

                // Agrupar todas as alterações por item (para visão consolidada)
                const byItem: Record<string, { numero_item: string; proposals: Array<{ empresa: string; change: any }> }> = {}
                for (const p of withChanges) {
                  for (const c of p.changes) {
                    if (!byItem[c.numero_item]) byItem[c.numero_item] = { numero_item: c.numero_item, proposals: [] }
                    byItem[c.numero_item].proposals.push({ empresa: p.empresa, change: c })
                  }
                }
                const byItemList = Object.values(byItem).sort((a, b) => a.numero_item.localeCompare(b.numero_item))

                return (
                  <div className="space-y-6">
                    {/* Cards de resumo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-600 text-white rounded-xl px-4 py-4">
                        <p className="text-xs font-medium opacity-75">Propostas analisadas</p>
                        <p className="text-3xl font-bold mt-1">{allProposals.length}</p>
                        <p className="text-xs opacity-60 mt-0.5">Rev. {scopeData.revision_numero}</p>
                      </div>
                      <div className={`rounded-xl px-4 py-4 border ${withChanges.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                        <p className={`text-xs font-medium ${withChanges.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>Com alterações</p>
                        <p className={`text-3xl font-bold mt-1 ${withChanges.length > 0 ? 'text-amber-700' : 'text-green-700'}`}>{withChanges.length}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{totalChanges} item(ns) alterado(s)</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
                        <p className="text-xs text-gray-400 font-medium">Sem alterações</p>
                        <p className="text-3xl font-bold text-gray-700 mt-1">{allProposals.length - withChanges.length}</p>
                        <p className="text-xs text-gray-400 mt-0.5">alinhadas com a PQ</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
                        <p className="text-xs text-gray-400 font-medium mb-2">Campos alterados</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Descrição</span><span className="font-semibold text-red-600">{descChanges}</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Unidade</span><span className="font-semibold text-amber-600">{unidChanges}</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">Quantidade</span><span className="font-semibold text-orange-600">{qtdChanges}</span></div>
                        </div>
                      </div>
                    </div>

                    {!scopeData.any_changes ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <CheckCircle size={48} className="text-green-500" />
                        <p className="text-green-700 font-semibold">Nenhuma alteração de escopo detectada.</p>
                        <p className="text-gray-400 text-sm">Todas as propostas estão alinhadas com a PQ.</p>
                      </div>
                    ) : (
                      <>
                        {/* Cards por proposta */}
                        <div>
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resumo por Proponente</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {allProposals.map((p: any) => (
                              <div key={p.id} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${p.has_changes ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                                {p.has_changes ? <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" /> : <CheckCircle size={16} className="text-green-500 flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 truncate">{p.empresa}</p>
                                  <p className={`text-xs ${p.has_changes ? 'text-amber-600' : 'text-green-600'}`}>
                                    {p.has_changes ? `${p.changes.length} item(ns) com divergência` : 'Escopo em conformidade'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Detalhamento por item */}
                        <div>
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Detalhamento por Item ({byItemList.length} item{byItemList.length !== 1 ? 'ns' : ''} com divergência)
                          </h3>
                          <div className="space-y-3">
                            {byItemList.map(({ numero_item, proposals: propList }) => (
                              <div key={numero_item} className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-gray-700">{numero_item}</span>
                                  <span className="text-xs text-gray-400">{propList[0].change.descricao_pq}</span>
                                  <span className="ml-auto text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                    {propList.length} proponente{propList.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="overflow-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-white border-b border-gray-100">
                                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Proponente</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Campo</th>
                                        <th className="px-3 py-2 text-left font-semibold text-blue-600">PQ (original)</th>
                                        <th className="px-3 py-2 text-left font-semibold text-amber-600">Proposta (alterado)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {propList.flatMap(({ empresa, change }, pi) =>
                                        change.changed_fields.map((field: string, fi: number) => (
                                          <tr key={`${empresa}-${field}`} className={`border-b border-gray-100 ${pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                            {fi === 0 && (
                                              <td className="px-3 py-2 font-semibold text-gray-700 align-top" rowSpan={change.changed_fields.length}>
                                                {empresa}
                                              </td>
                                            )}
                                            <td className="px-3 py-2 text-gray-500 capitalize">
                                              {field === 'descricao' ? 'Descrição' : field === 'unidade' ? 'Unidade' : 'Quantidade'}
                                            </td>
                                            <td className="px-3 py-2 text-blue-700 font-medium max-w-[220px]">
                                              <div className="truncate" title={field === 'descricao' ? change.descricao_pq : undefined}>
                                                {field === 'descricao' ? change.descricao_pq
                                                  : field === 'unidade' ? change.unidade_pq
                                                  : formatNumber(change.quantidade_pq, 4)}
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-amber-700 font-semibold bg-amber-50 max-w-[220px]">
                                              <div className="truncate" title={field === 'descricao' ? (change.descricao_proposta ?? '—') : undefined}>
                                                {field === 'descricao' ? (change.descricao_proposta ?? '—')
                                                  : field === 'unidade' ? (change.unidade_proposta ?? '—')
                                                  : formatNumber(change.quantidade_proposta ?? null, 4)}
                                              </div>
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })()
            )}

            {/* ── REVISÕES ── */}
            {tab === 'revisoes' && (
              <div className="space-y-6">
                {/* Seleção de revisões */}
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Revisão A</label>
                    <select
                      value={revA}
                      onChange={(e) => { setRevA(e.target.value === '' ? '' : Number(e.target.value)); setCompareTriggered(false) }}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Selecione…</option>
                      {(revisions ?? []).map((r) => (
                        <option key={r.id} value={r.numero}>Rev. {r.numero}{r.descricao ? ` — ${r.descricao}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Revisão B</label>
                    <select
                      value={revB}
                      onChange={(e) => { setRevB(e.target.value === '' ? '' : Number(e.target.value)); setCompareTriggered(false) }}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Selecione…</option>
                      {(revisions ?? []).map((r) => (
                        <option key={r.id} value={r.numero}>Rev. {r.numero}{r.descricao ? ` — ${r.descricao}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setCompareTriggered(true)}
                    disabled={revA === '' || revB === '' || revA === revB}
                    className="bg-blue-600 text-white rounded-xl px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
                  >
                    Comparar
                  </button>
                </div>

                {loadingCompare && <Loading />}

                {compareData && !loadingCompare && (() => {
                  const added    = compareData.by_item.filter((i: any) => i.status === 'added')
                  const removed  = compareData.by_item.filter((i: any) => i.status === 'removed')
                  const changed  = compareData.by_item.filter((i: any) => i.status === 'changed')
                  const unchanged = compareData.by_item.filter((i: any) => i.status === 'unchanged')
                  return (
                  <div className="space-y-6">
                    {/* Global metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: `Total Rev. ${compareData.rev_a}`, value: formatBRL(compareData.global.total_a), color: 'text-gray-800', sub: null },
                        { label: `Total Rev. ${compareData.rev_b}`, value: formatBRL(compareData.global.total_b), color: 'text-gray-800', sub: null },
                        { label: 'Delta (R$)', value: (compareData.global.delta >= 0 ? '+' : '') + formatBRL(compareData.global.delta), color: compareData.global.delta >= 0 ? 'text-red-600' : 'text-green-700', sub: null },
                        { label: 'Delta (%)', value: (compareData.global.delta_pct >= 0 ? '+' : '') + formatPercent(compareData.global.delta_pct), color: compareData.global.delta_pct >= 0 ? 'text-red-600' : 'text-green-700', sub: null },
                      ].map((m) => (
                        <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{m.label}</p>
                          <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Item change summary */}
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: 'Adicionados', count: added.length, cls: 'bg-green-50 border-green-200 text-green-700' },
                        { label: 'Removidos',   count: removed.length, cls: 'bg-red-50 border-red-200 text-red-600' },
                        { label: 'Alterados',   count: changed.length, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
                        { label: 'Sem alteração', count: unchanged.length, cls: 'bg-gray-50 border-gray-200 text-gray-500' },
                      ].map((s) => (
                        <div key={s.label} className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 ${s.cls}`}>
                          <span className="text-2xl font-bold leading-none">{s.count}</span>
                          <span className="text-xs font-medium">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Added items */}
                    {added.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                          Itens Adicionados na Rev. {compareData.rev_b} ({added.length})
                        </h3>
                        <div className="overflow-auto rounded-xl border border-green-200">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-green-50 border-b border-green-100">
                                <th className="px-3 py-2 text-left font-semibold text-green-700">Item</th>
                                <th className="px-3 py-2 text-left font-semibold text-green-700">Descrição</th>
                                <th className="px-3 py-2 text-right font-semibold text-green-700">Valor Rev. B</th>
                              </tr>
                            </thead>
                            <tbody>
                              {added.map((item: any) => (
                                <tr key={item.numero_item} className="border-b border-green-50 bg-green-50/40 hover:bg-green-50">
                                  <td className="px-3 py-2 font-mono text-green-700">{item.numero_item}</td>
                                  <td className="px-3 py-2 text-gray-700 max-w-[300px]"><div className="truncate" title={item.descricao}>{item.descricao}</div></td>
                                  <td className="px-3 py-2 text-right font-semibold text-green-700">{item.valor_b != null ? formatBRL(item.valor_b) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Removed items */}
                    {removed.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          Itens Removidos da Rev. {compareData.rev_b} ({removed.length})
                        </h3>
                        <div className="overflow-auto rounded-xl border border-red-200">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-red-50 border-b border-red-100">
                                <th className="px-3 py-2 text-left font-semibold text-red-700">Item</th>
                                <th className="px-3 py-2 text-left font-semibold text-red-700">Descrição</th>
                                <th className="px-3 py-2 text-right font-semibold text-red-700">Valor Rev. A</th>
                              </tr>
                            </thead>
                            <tbody>
                              {removed.map((item: any) => (
                                <tr key={item.numero_item} className="border-b border-red-50 bg-red-50/40 hover:bg-red-50">
                                  <td className="px-3 py-2 font-mono text-red-700">{item.numero_item}</td>
                                  <td className="px-3 py-2 text-gray-700 max-w-[300px]"><div className="truncate" title={item.descricao}>{item.descricao}</div></td>
                                  <td className="px-3 py-2 text-right font-semibold text-red-600">{item.valor_a != null ? formatBRL(item.valor_a) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* By discipline */}
                    {compareData.by_discipline.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Por Disciplina</h3>
                        <div className="overflow-auto rounded-xl border border-gray-200">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Disciplina</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Rev. A</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Rev. B</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Delta</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-600">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {compareData.by_discipline.map((d: any, i: number) => (
                                <tr key={d.disciplina} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                  <td className="px-3 py-2 text-gray-700">{d.disciplina}</td>
                                  <td className="px-3 py-2 text-right text-gray-600">{formatBRL(d.total_a)}</td>
                                  <td className="px-3 py-2 text-right text-gray-600">{formatBRL(d.total_b)}</td>
                                  <td className={`px-3 py-2 text-right font-semibold ${d.delta >= 0 ? 'text-red-600' : 'text-green-700'}`}>{d.delta >= 0 ? '+' : ''}{formatBRL(d.delta)}</td>
                                  <td className={`px-3 py-2 text-right ${d.delta_pct >= 0 ? 'text-red-600' : 'text-green-700'}`}>{d.delta_pct >= 0 ? '+' : ''}{formatPercent(d.delta_pct)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Changed items with quantity detail */}
                    {(changed.length > 0) && (
                      <div>
                        <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                          Itens Alterados ({changed.length})
                        </h3>
                        <div className="overflow-auto rounded-xl border border-amber-200">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-amber-50 border-b border-amber-100">
                                <th className="px-3 py-2 text-left font-semibold text-amber-700">Item</th>
                                <th className="px-3 py-2 text-left font-semibold text-amber-700">Descrição</th>
                                <th className="px-3 py-2 text-right font-semibold text-amber-700">Qtd A</th>
                                <th className="px-3 py-2 text-right font-semibold text-amber-700">Qtd B</th>
                                <th className="px-3 py-2 text-right font-semibold text-amber-700">Δ Qtd</th>
                                <th className="px-3 py-2 text-right font-semibold text-amber-700">Valor A</th>
                                <th className="px-3 py-2 text-right font-semibold text-amber-700">Valor B</th>
                                <th className="px-3 py-2 text-right font-semibold text-amber-700">Δ Valor</th>
                                <th className="px-3 py-2 text-left font-semibold text-amber-700">Campos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changed.map((item: any, i: number) => {
                                const qChange = item.pq_change?.find((c: any) => c.field === 'quantidade')
                                const qtdA = qChange ? Number(qChange.valor_a) : null
                                const qtdB = qChange ? Number(qChange.valor_b) : null
                                const qtdDelta = qtdA !== null && qtdB !== null ? qtdB - qtdA : null
                                const changedFields: string[] = item.pq_change?.map((c: any) =>
                                  c.field === 'descricao' ? 'Descrição' :
                                  c.field === 'unidade' ? 'Unidade' :
                                  c.field === 'quantidade' ? 'Quantidade' : c.field
                                ) ?? []
                                return (
                                  <tr key={item.numero_item} className={`border-b border-amber-50 hover:bg-amber-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}`}>
                                    <td className="px-3 py-2 font-mono text-amber-700">{item.numero_item}</td>
                                    <td className="px-3 py-2 text-gray-700 max-w-[200px]"><div className="truncate" title={item.descricao}>{item.descricao}</div></td>
                                    <td className="px-3 py-2 text-right text-gray-500">{qtdA != null ? formatNumber(qtdA, 3) : '—'}</td>
                                    <td className={`px-3 py-2 text-right font-semibold ${qtdDelta !== null && qtdDelta !== 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                                      {qtdB != null ? formatNumber(qtdB, 3) : '—'}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-semibold ${qtdDelta === null ? 'text-gray-300' : qtdDelta > 0 ? 'text-red-600' : qtdDelta < 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                      {qtdDelta !== null ? `${qtdDelta > 0 ? '+' : ''}${formatNumber(qtdDelta, 3)}` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-500">{item.valor_a != null ? formatBRL(item.valor_a) : '—'}</td>
                                    <td className="px-3 py-2 text-right text-gray-600">{item.valor_b != null ? formatBRL(item.valor_b) : '—'}</td>
                                    <td className={`px-3 py-2 text-right font-semibold ${(item.delta ?? 0) >= 0 ? 'text-red-600' : 'text-green-700'}`}>
                                      {item.delta != null ? `${item.delta >= 0 ? '+' : ''}${formatBRL(item.delta)}` : '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1 flex-wrap">
                                        {changedFields.map((f: string) => (
                                          <span key={f} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">{f}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* All items summary */}
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Todos os Itens</h3>
                      <div className="overflow-auto rounded-xl border border-gray-200">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-3 py-2 text-left font-semibold text-gray-600">Item</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-600">Descrição</th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-600">Status</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-600">Qtd A</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-600">Qtd B</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-600">Valor A</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-600">Valor B</th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-600">Delta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compareData.by_item.map((item: any, i: number) => {
                              const rowCls = item.status === 'added' ? 'bg-green-50/60' : item.status === 'removed' ? 'bg-red-50/60' : item.status === 'changed' ? 'bg-amber-50/60' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                              const statusBadge = item.status === 'added' ? 'bg-green-100 text-green-700' : item.status === 'removed' ? 'bg-red-100 text-red-600' : item.status === 'changed' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                              const statusLabel = item.status === 'added' ? '+ Adicionado' : item.status === 'removed' ? '− Removido' : item.status === 'changed' ? '~ Alterado' : 'Igual'
                              const qChange = item.pq_change?.find((c: any) => c.field === 'quantidade')
                              return (
                                <tr key={item.numero_item} className={`border-b border-gray-100 ${rowCls}`}>
                                  <td className="px-3 py-1.5 font-mono text-gray-500 text-[11px]">{item.numero_item}</td>
                                  <td className="px-3 py-1.5 text-gray-700 max-w-[180px]"><div className="truncate" title={item.descricao}>{item.descricao}</div></td>
                                  <td className="px-3 py-1.5 text-center"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusBadge}`}>{statusLabel}</span></td>
                                  <td className="px-3 py-1.5 text-right text-gray-400">{qChange ? formatNumber(Number(qChange.valor_a), 3) : '—'}</td>
                                  <td className={`px-3 py-1.5 text-right ${qChange && qChange.valor_a !== qChange.valor_b ? 'text-amber-700 font-semibold' : 'text-gray-400'}`}>
                                    {qChange ? formatNumber(Number(qChange.valor_b), 3) : '—'}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-gray-500">{item.valor_a != null ? formatBRL(item.valor_a) : '—'}</td>
                                  <td className="px-3 py-1.5 text-right text-gray-600">{item.valor_b != null ? formatBRL(item.valor_b) : '—'}</td>
                                  <td className={`px-3 py-1.5 text-right font-semibold ${(item.delta ?? 0) > 0 ? 'text-red-600' : (item.delta ?? 0) < 0 ? 'text-green-700' : 'text-gray-300'}`}>
                                    {item.delta != null && item.delta !== 0 ? `${item.delta > 0 ? '+' : ''}${formatBRL(item.delta)}` : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  )
                })()}

                {!compareData && !loadingCompare && compareTriggered && (
                  <EmptyState message="Não foi possível comparar as revisões selecionadas." />
                )}
                {!compareTriggered && (
                  <EmptyState message="Selecione duas revisões e clique em Comparar." />
                )}
              </div>
            )}
          </div>
        </div>
    </div>
  )
}