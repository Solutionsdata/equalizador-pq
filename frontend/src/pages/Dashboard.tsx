import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsAPI, analyticsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Project, BaselineEntry } from '../types'
import { getTipoObraLabel, STATUS_LABELS, formatBRL, formatPercent } from '../types'
import {
  FolderOpen, Plus, ArrowRight, ChevronRight,
  TrendingDown, Trophy, TrendingUp, BarChart3,
  Clock, CheckCircle2, Activity, Target, Handshake,
  Timer, AlertCircle,
} from 'lucide-react'
import GuidedTour, { RestartTourButton } from '../components/GuidedTour'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  Legend, ReferenceLine,
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO:     'bg-gray-100 text-gray-500',
  EM_ANDAMENTO: 'bg-blue-50 text-blue-700 border border-blue-200',
  CONCLUIDO:    'bg-green-50 text-green-700 border border-green-200',
  ARQUIVADO:    'bg-gray-100 text-gray-400',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function fmtShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}k`
  return formatBRL(value)
}

function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${value.toFixed(decimals)}%`
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

type Period = 'mes' | 'ano'

function getPeriodKey(iso: string, period: Period): string {
  const d = new Date(iso)
  if (period === 'ano') return String(d.getFullYear())
  return d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('. ', '/')
}

// ── Saving ao longo do tempo ──────────────────────────────────────────────────

function SavingTimelineChart({
  entries, period,
}: { entries: BaselineEntry[]; period: Period }) {
  const data = useMemo(() => {
    const map = new Map<string, {
      savOrcPcts: number[]; savNegPcts: number[]; slas: number[]; count: number
    }>()

    const sorted = [...entries].sort(
      (a, b) => new Date(a.data_premiacao).getTime() - new Date(b.data_premiacao).getTime()
    )

    for (const e of sorted) {
      const key = getPeriodKey(e.data_premiacao, period)
      const cur = map.get(key) ?? { savOrcPcts: [], savNegPcts: [], slas: [], count: 0 }

      if (e.valor_referencia_pq && e.valor_referencia_pq > 0) {
        const pct = ((e.valor_referencia_pq - e.valor_total) / e.valor_referencia_pq) * 100
        cur.savOrcPcts.push(pct)
      }
      if (e.valor_primeira_proposta && e.valor_primeira_proposta > 0 && e.valor_primeira_proposta > e.valor_total) {
        const pct = ((e.valor_primeira_proposta - e.valor_total) / e.valor_primeira_proposta) * 100
        cur.savNegPcts.push(pct)
      }
      if (e.sla_dias != null && e.sla_dias >= 0) cur.slas.push(e.sla_dias)
      cur.count++

      map.set(key, cur)
    }

    return [...map.entries()].map(([periodo, d]) => ({
      periodo,
      saving_orcamento: avg(d.savOrcPcts) != null ? +((avg(d.savOrcPcts) as number).toFixed(1)) : null,
      saving_negociacao: avg(d.savNegPcts) != null ? +((avg(d.savNegPcts) as number).toFixed(1)) : null,
      sla_medio: avg(d.slas) != null ? Math.round(avg(d.slas) as number) : null,
      count: d.count,
    }))
  }, [entries, period])

  if (data.length === 0) return (
    <EmptyChart label="Sem dados de projetos concluídos no período" />
  )

  const Tip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs min-w-[200px]">
        <p className="font-bold text-gray-700 mb-2 pb-1 border-b border-gray-100">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4 mt-1">
            <span className="text-gray-500 flex items-center gap-1">
              <span style={{ color: p.color }}>●</span> {p.name}
            </span>
            <span className="font-bold" style={{ color: p.color }}>
              {p.dataKey === 'sla_medio' ? `${p.value}d` : `${p.value}%`}
            </span>
          </div>
        ))}
        <div className="flex justify-between mt-1.5 pt-1.5 border-t border-gray-100">
          <span className="text-gray-400">Projetos:</span>
          <span className="font-medium text-gray-600">{payload[0]?.payload?.count}</span>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="pct"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={40}
        />
        <YAxis
          yAxisId="dias"
          orientation="right"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}d`}
          width={36}
        />
        <Tooltip content={<Tip />} />
        <Legend
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: '#6b7280' }}>{value}</span>}
        />
        <ReferenceLine yAxisId="pct" y={0} stroke="#e5e7eb" />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="saving_orcamento"
          name="Saving Orçamento (%)"
          stroke="#16a34a"
          strokeWidth={2.5}
          dot={{ fill: '#16a34a', r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="saving_negociacao"
          name="Saving Negociação (%)"
          stroke="#2563eb"
          strokeWidth={2.5}
          strokeDasharray="6 3"
          dot={{ fill: '#2563eb', r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
        <Line
          yAxisId="dias"
          type="monotone"
          dataKey="sla_medio"
          name="SLA médio (dias)"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Saving por projeto (bar chart) ────────────────────────────────────────────

function SavingByProjectChart({ entries }: { entries: BaselineEntry[] }) {
  const data = useMemo(() => {
    return entries
      .filter((e) => e.valor_referencia_pq && e.valor_referencia_pq > 0)
      .map((e) => {
        const savOrc = e.valor_referencia_pq
          ? +((((e.valor_referencia_pq - e.valor_total) / e.valor_referencia_pq) * 100).toFixed(1))
          : null
        const savNeg = (e.valor_primeira_proposta && e.valor_primeira_proposta > e.valor_total)
          ? +((((e.valor_primeira_proposta - e.valor_total) / e.valor_primeira_proposta) * 100).toFixed(1))
          : null
        return {
          nome: e.project_nome.length > 20 ? e.project_nome.slice(0, 20) + '…' : e.project_nome,
          saving_orcamento: savOrc,
          saving_negociacao: savNeg,
          sla: e.sla_dias,
          valor: e.valor_total,
        }
      })
      .sort((a, b) => (b.saving_orcamento ?? 0) - (a.saving_orcamento ?? 0))
      .slice(0, 8)
  }, [entries])

  if (data.length === 0) return <EmptyChart label="Nenhum projeto com dados de saving" />

  const Tip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs min-w-[200px]">
        <p className="font-bold text-gray-700 mb-2 pb-1 border-b border-gray-100 truncate">{label}</p>
        {payload.map((p: any) => p.value != null && (
          <div key={p.dataKey} className="flex justify-between gap-4 mt-1">
            <span className="text-gray-500 flex items-center gap-1">
              <span style={{ color: p.color }}>●</span> {p.name}
            </span>
            <span className="font-bold" style={{ color: p.color }}>{p.value}%</span>
          </div>
        ))}
        <div className="flex justify-between mt-1.5 pt-1.5 border-t border-gray-100">
          <span className="text-gray-400">Valor premiado:</span>
          <span className="font-medium text-gray-600">{fmtShort(payload[0]?.payload?.valor)}</span>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category" dataKey="nome"
          tick={{ fontSize: 10, fill: '#374151' }}
          axisLine={false} tickLine={false} width={130}
        />
        <Tooltip content={<Tip />} />
        <Legend
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: '#6b7280' }}>{value}</span>}
        />
        <Bar dataKey="saving_orcamento" name="Saving Orçamento (%)" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey="saving_negociacao" name="Saving Negociação (%)" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── SLA por projeto ───────────────────────────────────────────────────────────

function SLABarChart({ entries }: { entries: BaselineEntry[] }) {
  const data = useMemo(() => {
    return entries
      .filter((e) => e.sla_dias != null && e.sla_dias >= 0)
      .map((e) => ({
        nome: e.project_nome.length > 22 ? e.project_nome.slice(0, 22) + '…' : e.project_nome,
        sla: e.sla_dias as number,
        valor: e.valor_total,
      }))
      .sort((a, b) => a.sla - b.sla)
      .slice(0, 8)
  }, [entries])

  if (data.length === 0) return <EmptyChart label="Nenhum dado de SLA disponível" />

  const avgSla = avg(data.map((d) => d.sla))

  const Tip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs">
        <p className="font-bold text-gray-700 mb-2 pb-1 border-b border-gray-100 truncate">{label}</p>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">SLA (dias):</span>
          <span className="font-bold text-amber-600">{payload[0]?.value}d</span>
        </div>
        <div className="flex justify-between gap-4 mt-1">
          <span className="text-gray-500">Valor:</span>
          <span className="font-medium text-gray-600">{fmtShort(payload[0]?.payload?.valor)}</span>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}d`} />
        <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={130} />
        <Tooltip content={<Tip />} />
        {avgSla != null && (
          <ReferenceLine x={avgSla} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `Média: ${Math.round(avgSla)}d`, fontSize: 9, fill: '#ef4444', position: 'insideTopRight' }} />
        )}
        <Bar dataKey="sla" name="SLA (dias)" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((d, i) => (
            <Cell key={i} fill={avgSla != null && d.sla > avgSla ? '#f59e0b' : '#10b981'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Mini Revision Evolution Chart ─────────────────────────────────────────────

function MiniRevisionChart({ data }: { data: Array<{ numero: number; valor: number }> }) {
  const chartData = data.map((d) => ({ rev: `R${d.numero}`, valor: d.valor }))
  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: 6 }}>
        <XAxis dataKey="rev" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          formatter={(v: any) => [fmtShort(Number(v)), 'Valor']}
          labelStyle={{ fontSize: 9, color: '#6b7280' }}
          contentStyle={{ fontSize: 9, borderRadius: 8, border: '1px solid #e5e7eb', padding: '4px 8px' }}
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center text-gray-300 text-xs gap-2">
      <AlertCircle size={24} />
      <span>{label}</span>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, iconBg, iconColor, border, valueColor = 'text-gray-900',
  badge,
}: {
  label: string; value: string | number; sub: string
  icon: React.ElementType; iconBg: string; iconColor: string; border: string
  valueColor?: string; badge?: { text: string; color: string }
}) {
  return (
    <div className={`bg-white border ${border} rounded-xl p-4 hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-tight pr-2">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className={`text-3xl font-bold leading-none ${valueColor}`}>{value}</p>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-0.5 ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">{sub}</p>
    </div>
  )
}

// ── Per-project KPI table ─────────────────────────────────────────────────────

function ProjectKpiTable({ entries, completedIds }: { entries: BaselineEntry[]; completedIds: Set<number> }) {
  const rows = useMemo(() => {
    return entries
      .filter((e) => completedIds.has(e.project_id))
      .map((e) => {
        const savOrc = (e.valor_referencia_pq && e.valor_referencia_pq > 0)
          ? ((e.valor_referencia_pq - e.valor_total) / e.valor_referencia_pq) * 100
          : null
        const econOrc = (e.valor_referencia_pq && e.valor_referencia_pq > 0)
          ? e.valor_referencia_pq - e.valor_total
          : null
        const savNeg = (e.valor_primeira_proposta && e.valor_primeira_proposta > e.valor_total)
          ? ((e.valor_primeira_proposta - e.valor_total) / e.valor_primeira_proposta) * 100
          : null
        const econNeg = (e.valor_primeira_proposta && e.valor_primeira_proposta > e.valor_total)
          ? e.valor_primeira_proposta - e.valor_total
          : null
        return { e, savOrc, econOrc, savNeg, econNeg }
      })
      .sort((a, b) => new Date(b.e.data_premiacao).getTime() - new Date(a.e.data_premiacao).getTime())
  }, [entries, completedIds])

  if (rows.length === 0) return (
    <div className="py-10 text-center text-sm text-gray-400">
      Nenhum projeto concluído com dados de saving disponíveis.
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-semibold">Projeto</th>
            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Ref. PQ</th>
            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Premiado</th>
            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap text-green-700">Sav. Orçamento</th>
            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap text-blue-700">Sav. Negociação</th>
            <th className="px-4 py-3 text-center font-semibold whitespace-nowrap text-amber-700">SLA (dias)</th>
            <th className="px-4 py-3 text-left font-semibold">Vencedor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ e, savOrc, econOrc, savNeg, econNeg }, idx) => (
            <tr
              key={e.proposal_id}
              className={`border-t border-gray-100 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}
            >
              <td className="px-4 py-3">
                <p className="font-semibold text-gray-800 text-sm truncate max-w-[180px]">{e.project_nome}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {new Date(e.data_premiacao).toLocaleDateString('pt-BR')}
                </p>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-600">
                {e.valor_referencia_pq ? fmtShort(e.valor_referencia_pq) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                {fmtShort(e.valor_total)}
              </td>
              <td className="px-4 py-3 text-right">
                {savOrc != null ? (
                  <div>
                    <span className={`text-sm font-bold ${savOrc >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {savOrc >= 0 ? '↓' : '↑'} {Math.abs(savOrc).toFixed(1)}%
                    </span>
                    {econOrc != null && (
                      <p className="text-[10px] text-green-500 mt-0.5">{fmtShort(Math.abs(econOrc))}</p>
                    )}
                  </div>
                ) : <span className="text-gray-300 text-xs">Sem ref.</span>}
              </td>
              <td className="px-4 py-3 text-right">
                {savNeg != null ? (
                  <div>
                    <span className="text-sm font-bold text-blue-600">↓ {savNeg.toFixed(1)}%</span>
                    {econNeg != null && (
                      <p className="text-[10px] text-blue-400 mt-0.5">{fmtShort(econNeg)}</p>
                    )}
                  </div>
                ) : <span className="text-gray-300 text-xs">sem Rev.0</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {e.sla_dias != null ? (
                  <span className={`text-sm font-bold ${e.sla_dias <= 30 ? 'text-green-600' : e.sla_dias <= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                    {e.sla_dias}d
                  </span>
                ) : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Trophy size={11} className="text-amber-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600 truncate max-w-[120px]">{e.empresa}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>('mes')

  const { data: _rawProjects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then((r) => r.data),
  })
  const projects: Project[] = Array.isArray(_rawProjects) ? _rawProjects : []

  const { data: _rawBaseline } = useQuery<BaselineEntry[]>({
    queryKey: ['baseline'],
    queryFn: () => analyticsAPI.getBaseline().then((r) => r.data),
  })
  const baseline: BaselineEntry[] = Array.isArray(_rawBaseline) ? _rawBaseline : []

  // IDs de projetos CONCLUÍDOS
  const completedIds = useMemo(
    () => new Set(projects.filter((p) => p.status === 'CONCLUIDO').map((p) => p.id)),
    [projects]
  )

  // Apenas entradas de projetos concluídos para os KPIs de performance
  const completedEntries = useMemo(
    () => baseline.filter((e) => completedIds.has(e.project_id)),
    [baseline, completedIds]
  )

  // ── Derivações de KPI ──────────────────────────────────────────────────────

  const total          = projects.length
  const emAndamento    = projects.filter((p) => p.status === 'EM_ANDAMENTO').length
  const concluidos     = projects.filter((p) => p.status === 'CONCLUIDO').length

  // Saving Orçamento
  const savOrcItems = completedEntries.filter((e) => e.valor_referencia_pq && e.valor_referencia_pq > 0)
  const savOrcPcts  = savOrcItems.map((e) => ((e.valor_referencia_pq! - e.valor_total) / e.valor_referencia_pq!) * 100)
  const savOrcMedio = avg(savOrcPcts)
  const econOrcTotal = savOrcItems.reduce((s, e) => s + (e.valor_referencia_pq! - e.valor_total), 0)
  const refPQTotal   = savOrcItems.reduce((s, e) => s + e.valor_referencia_pq!, 0)

  // Saving Negociação
  const savNegItems = completedEntries.filter(
    (e) => e.valor_primeira_proposta && e.valor_primeira_proposta > e.valor_total
  )
  const savNegPcts  = savNegItems.map((e) => ((e.valor_primeira_proposta! - e.valor_total) / e.valor_primeira_proposta!) * 100)
  const savNegMedio = avg(savNegPcts)
  const econNegTotal = savNegItems.reduce((s, e) => s + (e.valor_primeira_proposta! - e.valor_total), 0)

  // SLA
  const slaItems = completedEntries.filter((e) => e.sla_dias != null && e.sla_dias >= 0)
  const slaMedio = avg(slaItems.map((e) => e.sla_dias as number))

  // Valor total equalizado (todos os projetos)
  const totalValorEq = baseline.reduce((s, e) => s + e.valor_total, 0)

  const recentProjects = projects.slice(0, 6)

  // Positive saving = saved money = green; negative = overspent = red
  const savOrcIsPos = savOrcMedio == null || savOrcMedio >= 0

  const baselineByProject = useMemo(() => {
    const map: Record<number, BaselineEntry[]> = {}
    for (const e of baseline) { (map[e.project_id] ??= []).push(e) }
    return map
  }, [baseline])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <GuidedTour />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {greeting()}, {user?.nome?.split(' ')[0]}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Central de equalização · {total} projeto{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
            </p>
            <div className="mt-1.5"><RestartTourButton /></div>
          </div>
          <Link
            to="/projetos"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            <Plus size={16} /> Novo Projeto
          </Link>
        </div>

        {/* ── KPIs de status ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total de Projetos"
            value={total}
            sub={`${emAndamento} em andamento`}
            icon={FolderOpen}
            iconBg="bg-blue-50" iconColor="text-blue-600" border="border-blue-100"
          />
          <KpiCard
            label="Em Andamento"
            value={emAndamento}
            sub="processos ativos"
            icon={Activity}
            iconBg="bg-amber-50" iconColor="text-amber-600" border="border-amber-100"
          />
          <KpiCard
            label="Concluídos"
            value={concluidos}
            sub="projetos finalizados"
            icon={CheckCircle2}
            iconBg="bg-green-50" iconColor="text-green-600" border="border-green-100"
          />
          <KpiCard
            label="Volume Equalizado"
            value={totalValorEq > 0 ? fmtShort(totalValorEq) : '—'}
            sub={`${baseline.length} contrato${baseline.length !== 1 ? 's' : ''} premiado${baseline.length !== 1 ? 's' : ''}`}
            icon={TrendingUp}
            iconBg="bg-indigo-50" iconColor="text-indigo-600" border="border-indigo-100"
          />
        </div>

        {/* ── Seção de Indicadores de Performance ──────────────────────── */}
        {concluidos > 0 && (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 bg-green-500 rounded-full" />
                <h2 className="text-sm font-bold text-gray-900">Indicadores de Desempenho</h2>
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  {concluidos} projeto{concluidos !== 1 ? 's' : ''} concluído{concluidos !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-gray-400 ml-3">
                Métricas calculadas sobre projetos com status Concluído que possuem dados de referência e premiação.
              </p>
            </div>

            {/* KPIs de performance (3 grandes) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Saving Orçamento */}
              <div className={`bg-white border ${savOrcIsPos ? 'border-green-100' : 'border-red-100'} rounded-xl p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${savOrcIsPos ? 'bg-green-50' : 'bg-red-50'} flex items-center justify-center`}>
                    <Target size={18} className={savOrcIsPos ? 'text-green-600' : 'text-red-500'} />
                  </div>
                  <span className={`text-[10px] font-bold ${savOrcIsPos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'} px-2 py-1 rounded-full uppercase tracking-wide`}>
                    Saving Orçamento
                  </span>
                </div>
                <p className={`text-4xl font-black ${savOrcIsPos ? 'text-green-600' : 'text-red-500'} leading-none mb-1`}>
                  {savOrcMedio != null ? `${savOrcMedio.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  proposta premiada vs. referência PQ da mesma revisão
                </p>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Economia total</span>
                    <span className={`font-bold ${savOrcIsPos ? 'text-green-600' : 'text-red-500'}`}>{Math.abs(econOrcTotal) > 0 ? fmtShort(econOrcTotal) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Ref. PQ total</span>
                    <span className="font-medium text-gray-600">{refPQTotal > 0 ? fmtShort(refPQTotal) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Projetos com ref.</span>
                    <span className="font-medium text-gray-600">{savOrcItems.length}</span>
                  </div>
                </div>
                {savOrcItems.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle size={11} /> Preencha preço de referência na PQ
                  </p>
                )}
              </div>

              {/* Saving Negociação */}
              <div className="bg-white border border-blue-100 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Handshake size={18} className="text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-full uppercase tracking-wide">
                    Saving Negociação
                  </span>
                </div>
                <p className="text-4xl font-black text-blue-600 leading-none mb-1">
                  {savNegMedio != null ? `${savNegMedio.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  proposta do vencedor na Rev. 0 vs. revisão final premiada
                </p>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Economia de negociação</span>
                    <span className="font-bold text-blue-600">{econNegTotal > 0 ? fmtShort(econNegTotal) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Projetos com revisões</span>
                    <span className="font-medium text-gray-600">{savNegItems.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Rev. 0 → última revisão</span>
                  </div>
                </div>
                {savNegItems.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle size={11} /> Disponível quando houver revisões
                  </p>
                )}
              </div>

              {/* SLA */}
              <div className="bg-white border border-amber-100 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Timer size={18} className="text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded-full uppercase tracking-wide">
                    SLA do Processo
                  </span>
                </div>
                <p className="text-4xl font-black text-amber-600 leading-none mb-1">
                  {slaMedio != null ? `${Math.round(slaMedio)}d` : '—'}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  duração média da criação até a premiação
                </p>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Mais rápido</span>
                    <span className="font-bold text-green-600">
                      {slaItems.length > 0 ? `${Math.min(...slaItems.map((e) => e.sla_dias as number))}d` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Mais longo</span>
                    <span className="font-medium text-red-500">
                      {slaItems.length > 0 ? `${Math.max(...slaItems.map((e) => e.sla_dias as number))}d` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Do cadastro PQ → premiação</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Gráficos de evolução ─────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

              {/* Evolução temporal (2 cols) */}
              <div className="chart-card xl:col-span-2">
                <div className="chart-header">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <TrendingDown size={15} className="text-green-600" />
                      Evolução dos Indicadores ao Longo do Tempo
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Saving orçamento (verde) · Saving negociação (azul) · SLA médio (eixo direito)
                    </p>
                  </div>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                    {(['mes', 'ano'] as Period[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          period === p ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {p === 'mes' ? 'Mês' : 'Ano'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-4 pt-4 pb-3">
                  <SavingTimelineChart entries={completedEntries} period={period} />
                </div>
              </div>

              {/* SLA por projeto */}
              <div className="chart-card">
                <div className="chart-header">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    SLA por Projeto (dias)
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Verde = abaixo da média · Amarelo = acima
                  </p>
                </div>
                <div className="px-2 py-4">
                  <SLABarChart entries={completedEntries} />
                </div>
              </div>
            </div>

            {/* Saving por projeto (horizontal bar) */}
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 size={15} className="text-blue-600" />
                  Saving por Projeto — Orçamento vs. Negociação
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Comparação do percentual de redução atingido em cada processo
                </p>
              </div>
              <div className="px-4 py-4">
                <SavingByProjectChart entries={completedEntries} />
              </div>
            </div>

            {/* Tabela detalhada por projeto */}
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Trophy size={14} className="text-amber-500" />
                  Detalhamento por Projeto Concluído
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Todos os indicadores de cada processo · Saving Orçamento = premiado vs. ref. PQ da revisão · Saving Negociação = Rev. 0 → revisão final do vencedor
                </p>
              </div>
              <ProjectKpiTable entries={baseline} completedIds={completedIds} />
            </div>
          </>
        )}

        {/* ── Projetos Recentes ──────────────────────────────────────────── */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              <h2 className="text-sm font-bold text-gray-800">Projetos Recentes</h2>
            </div>
            <Link to="/projetos" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
              Ver todos <ChevronRight size={11} />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="py-16 text-center px-6">
              <FolderOpen size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">Nenhum projeto criado</p>
              <p className="text-xs text-gray-400 mb-5">Crie seu primeiro projeto para começar.</p>
              <Link to="/projetos" className="btn-primary text-sm mx-auto">
                <Plus size={14} /> Criar projeto
              </Link>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentProjects.map((p) => {
                const winners = (baselineByProject[p.id] ?? []).sort(
                  (a, b) => new Date(b.data_premiacao).getTime() - new Date(a.data_premiacao).getTime()
                )
                const latestWinner = winners[0]
                const savOrc = latestWinner?.valor_referencia_pq
                  ? ((latestWinner.valor_referencia_pq - latestWinner.valor_total) / latestWinner.valor_referencia_pq) * 100
                  : null
                const savOrcPos = savOrc == null || savOrc >= 0

                return (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all flex flex-col gap-3">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                          p.status === 'CONCLUIDO'    ? 'bg-green-500' :
                          p.status === 'EM_ANDAMENTO' ? 'bg-blue-500 ring-3 ring-blue-100' :
                          p.status === 'ARQUIVADO'    ? 'bg-gray-300' : 'bg-gray-200'
                        }`} />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm leading-snug truncate">{p.nome}</p>
                          {p.numero_licitacao && (
                            <p className="text-[10px] text-gray-400 mt-0.5">TR: {p.numero_licitacao}</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span>{getTipoObraLabel(p.tipo_obra)}</span>
                      {p.extensao_km != null && (
                        <span className="font-medium text-gray-500">{Number(p.extensao_km).toFixed(1)} km</span>
                      )}
                      <span>{p.total_pq_items} itens</span>
                      <span>{p.total_proposals} proposta{p.total_proposals !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Winner block */}
                    {latestWinner ? (
                      <>
                        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Trophy size={11} className="text-amber-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-gray-700 truncate">{latestWinner.empresa}</span>
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <span className="text-lg font-black text-gray-900 leading-none">{fmtShort(latestWinner.valor_total)}</span>
                            {latestWinner.media_propostas != null && (
                              <div className="text-right">
                                <p className="text-[9px] text-gray-400 leading-none">Média propostas</p>
                                <p className="text-xs font-semibold text-gray-500 mt-0.5">{fmtShort(latestWinner.media_propostas)}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {savOrc != null && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                savOrcPos
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-red-50 text-red-600 border border-red-200'
                              }`}>
                                {savOrcPos ? <TrendingDown size={9} /> : <TrendingUp size={9} />}
                                {Math.abs(savOrc).toFixed(1)}% saving
                              </span>
                            )}
                            {latestWinner.sla_dias != null && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Clock size={9} />
                                {latestWinner.sla_dias}d SLA
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mini revision evolution chart */}
                        {latestWinner.revision_history && latestWinner.revision_history.length >= 2 && (
                          <div>
                            <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                              <Activity size={9} /> Evolução por revisão
                            </p>
                            <MiniRevisionChart data={latestWinner.revision_history} />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-300 italic">Sem proposta premiada</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-1">
                      <Link
                        to={`/projetos/${p.id}/equalizacao`}
                        className="flex-1 text-center text-xs text-blue-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-100 flex items-center justify-center gap-1 transition-colors"
                      >
                        Equalizar <ArrowRight size={10} />
                      </Link>
                      <Link
                        to={`/projetos/${p.id}/analises`}
                        className="flex-1 text-center text-xs text-gray-500 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 border border-gray-100 flex items-center justify-center gap-1 transition-colors"
                      >
                        Análises <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

    </div>
  )
}
