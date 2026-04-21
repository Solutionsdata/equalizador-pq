import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsAPI, analyticsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Project, BaselineEntry } from '../types'
import { getTipoObraLabel, STATUS_LABELS, formatBRL } from '../types'
import {
  FolderOpen, Plus, ArrowRight, ChevronRight,
  Zap, Trophy, TrendingUp, BarChart3, Calendar,
  Building2, Clock, CheckCircle2, Activity,
} from 'lucide-react'
import GuidedTour, { RestartTourButton } from '../components/GuidedTour'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
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

function formatShort(value: number): string {
  if (value >= 1_000_000) return `R$\u00a0${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$\u00a0${(value / 1_000).toFixed(0)}k`
  return formatBRL(value)
}

type Period = 'semana' | 'mes' | 'ano'

function getPeriodKey(iso: string, period: Period): string {
  const d = new Date(iso)
  if (period === 'ano') return String(d.getFullYear())
  if (period === 'mes') {
    return d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('. ', '/')
  }
  // ISO week
  const tmp = new Date(d.getTime())
  tmp.setHours(0, 0, 0, 0)
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7))
  const yearStart = new Date(tmp.getFullYear(), 0, 1)
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `Sem\u00a0${String(week).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}

// ── Timeline chart ────────────────────────────────────────────────────────────

function TimelineChart({ baseline, period }: { baseline: BaselineEntry[]; period: Period }) {
  const data = useMemo(() => {
    const map = new Map<string, { valor: number; count: number }>()
    const sorted = [...baseline].sort(
      (a, b) => new Date(a.data_premiacao).getTime() - new Date(b.data_premiacao).getTime()
    )
    for (const e of sorted) {
      const key = getPeriodKey(e.data_premiacao, period)
      const cur = map.get(key) ?? { valor: 0, count: 0 }
      map.set(key, { valor: cur.valor + e.valor_total, count: cur.count + 1 })
    }
    let acumulado = 0
    return [...map.entries()].map(([key, { valor, count }]) => {
      acumulado += valor
      return { periodo: key, valor, acumulado, count }
    })
  }, [baseline, period])

  if (data.length === 0) return (
    <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
      Nenhum contrato equalizado ainda
    </div>
  )

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs min-w-[180px]">
        <p className="font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">No período:</span>
            <span className="font-bold text-blue-600">{formatBRL(payload[0]?.value ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Acumulado:</span>
            <span className="font-bold text-indigo-600">{formatBRL(payload[1]?.value ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Contratos:</span>
            <span className="font-medium text-gray-600">{payload[0]?.payload?.count}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gValor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gAcum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="periodo"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatShort}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="valor"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#gValor)"
          name="Período"
          dot={{ fill: '#3b82f6', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="acumulado"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#gAcum)"
          strokeDasharray="5 3"
          name="Acumulado"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Project winners bar ───────────────────────────────────────────────────────

function ProjectWinnersBar({ entries }: { entries: BaselineEntry[] }) {
  if (entries.length === 0) return null
  // Group by project, sum winner values per revision
  const byProject: Record<number, { nome: string; revisions: { empresa: string; valor: number; date: string }[] }> = {}
  for (const e of entries) {
    if (!byProject[e.project_id]) byProject[e.project_id] = { nome: e.project_nome, revisions: [] }
    byProject[e.project_id].revisions.push({ empresa: e.empresa, valor: e.valor_total, date: e.data_premiacao })
  }

  const data = Object.values(byProject)
    .map((p) => ({ nome: p.nome.slice(0, 22), total: p.revisions.reduce((s, r) => s + r.valor, 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{payload[0]?.payload?.nome}</p>
        <p className="text-blue-600 font-bold">{formatBRL(payload[0]?.value ?? 0)}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 40, left: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
        <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={120} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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

  // KPI derivations
  const total       = projects.length
  const emAndamento = projects.filter((p) => p.status === 'EM_ANDAMENTO').length
  const concluidos  = projects.filter((p) => p.status === 'CONCLUIDO').length
  const totalValorEq = baseline.reduce((s, e) => s + e.valor_total, 0)

  // Baseline indexed by project_id → list of entries (multiple revisions possible)
  const baselineByProject = useMemo(() => {
    const map: Record<number, BaselineEntry[]> = {}
    for (const e of baseline) {
      ;(map[e.project_id] ??= []).push(e)
    }
    return map
  }, [baseline])

  const recentProjects = projects.slice(0, 8)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
      <GuidedTour />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {greeting()}, {user?.nome?.split(' ')[0]}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Central de equalização · {total} projeto{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
            </p>
            <div className="mt-1.5">
              <RestartTourButton />
            </div>
          </div>
          <Link
            to="/projetos"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            <Plus size={16} /> Novo Projeto
          </Link>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total de Projetos',
              value: total,
              sub: `${emAndamento} em andamento`,
              icon: FolderOpen,
              iconBg: 'bg-blue-50',
              iconColor: 'text-blue-600',
              border: 'border-blue-100',
            },
            {
              label: 'Em Andamento',
              value: emAndamento,
              sub: 'processos ativos',
              icon: Activity,
              iconBg: 'bg-amber-50',
              iconColor: 'text-amber-600',
              border: 'border-amber-100',
            },
            {
              label: 'Concluídos',
              value: concluidos,
              sub: 'projetos finalizados',
              icon: CheckCircle2,
              iconBg: 'bg-green-50',
              iconColor: 'text-green-600',
              border: 'border-green-100',
            },
            {
              label: 'Valor Total Equalizado',
              value: totalValorEq > 0 ? formatShort(totalValorEq) : '—',
              sub: `${baseline.length} contrato${baseline.length !== 1 ? 's' : ''} premiado${baseline.length !== 1 ? 's' : ''}`,
              icon: TrendingUp,
              iconBg: 'bg-indigo-50',
              iconColor: 'text-indigo-600',
              border: 'border-indigo-100',
            },
          ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, border }) => (
            <div key={label} className={`bg-white border ${border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={iconColor} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
              <p className="text-xs text-gray-400 mt-2">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Timeline + Projects grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Timeline (spans 2 cols) */}
          <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 size={15} className="text-blue-600" />
                  Valores Equalizados ao Longo do Tempo
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Área azul = por período · linha tracejada = acumulado
                </p>
              </div>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {(['semana', 'mes', 'ano'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      period === p
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Ano'}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 pt-4 pb-3">
              <TimelineChart baseline={baseline} period={period} />
            </div>
          </div>

          {/* Por Projeto */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                Valor por Projeto
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Contratos equalizados</p>
            </div>
            <div className="px-2 py-3">
              <ProjectWinnersBar entries={baseline} />
              {baseline.length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-gray-300">
                  <Trophy size={28} className="mb-2" />
                  <p className="text-xs">Nenhum contrato equalizado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Projects ──────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              <h2 className="text-sm font-bold text-gray-800">Projetos Recentes</h2>
            </div>
            <Link
              to="/projetos"
              className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
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
            <div className="divide-y divide-gray-50">
              {recentProjects.map((p) => {
                const winners = baselineByProject[p.id] ?? []
                // Sort winners by data_premiacao descending
                const sorted = [...winners].sort(
                  (a, b) => new Date(b.data_premiacao).getTime() - new Date(a.data_premiacao).getTime()
                )

                return (
                  <div
                    key={p.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors group"
                  >
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                      p.status === 'CONCLUIDO'    ? 'bg-green-500' :
                      p.status === 'EM_ANDAMENTO' ? 'bg-blue-500 ring-4 ring-blue-100' :
                      p.status === 'ARQUIVADO'    ? 'bg-gray-300' : 'bg-gray-200'
                    }`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.nome}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">{getTipoObraLabel(p.tipo_obra)}</span>
                        {p.numero_licitacao && (
                          <span className="text-xs text-gray-400">TR: {p.numero_licitacao}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {p.total_pq_items} itens · {p.total_proposals} proposta{p.total_proposals !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Winner values per revision */}
                      {sorted.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {sorted.map((e, i) => (
                            <div
                              key={e.proposal_id}
                              className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1"
                            >
                              <Trophy size={10} className="text-green-600 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] text-green-600 font-semibold leading-none">
                                  {formatBRL(e.valor_total)}
                                </p>
                                <p className="text-[9px] text-green-500 mt-0.5 truncate max-w-[120px]">
                                  {e.empresa}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
                      <Link
                        to={`/projetos/${p.id}/equalizacao`}
                        className="text-xs text-blue-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 flex items-center gap-1 transition-colors"
                      >
                        Equalizar <ArrowRight size={10} />
                      </Link>
                      <Link
                        to={`/projetos/${p.id}/analises`}
                        className="text-xs text-gray-500 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1 transition-colors"
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

        {/* ── Contextual tips ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {total === 0 && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-sm shadow-blue-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Comece criando um projeto</p>
                  <p className="text-sm text-blue-100 mt-1 leading-relaxed">
                    Cadastre um projeto, importe a Planilha de Quantitativos (PQ) e adicione propostas para equalizar.
                  </p>
                  <Link
                    to="/projetos"
                    className="inline-flex items-center gap-1 mt-3 bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Criar projeto <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {total > 0 && projects.every((p) => p.total_proposals === 0) && (
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold">Adicione propostas</p>
                  <p className="text-sm text-amber-100 mt-1 leading-relaxed">
                    Você tem projetos cadastrados. Adicione propostas para começar a equalização e análise comparativa.
                  </p>
                </div>
              </div>
            </div>
          )}

          {baseline.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-6 shadow-sm shadow-indigo-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold">Baseline atualizado</p>
                  <p className="text-sm text-indigo-100 mt-1 leading-relaxed">
                    {baseline.length} contrato{baseline.length !== 1 ? 's' : ''} premiado{baseline.length !== 1 ? 's' : ''} · valor total equalizado: <strong>{formatBRL(totalValorEq)}</strong>
                  </p>
                  <Link
                    to="/baseline"
                    className="inline-flex items-center gap-1 mt-3 bg-white text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    Ver Baseline completo <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {total > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">Distribuição por Status</p>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: 'Em Andamento', count: emAndamento, color: 'bg-blue-500' },
                      { label: 'Concluídos',   count: concluidos,  color: 'bg-green-500' },
                      { label: 'Rascunho',     count: projects.filter((p) => p.status === 'RASCUNHO').length, color: 'bg-gray-300' },
                      { label: 'Arquivados',   count: projects.filter((p) => p.status === 'ARQUIVADO').length, color: 'bg-gray-200' },
                    ].filter((s) => s.count > 0).map((s) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.color}`}
                            style={{ width: `${(s.count / total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-28 flex-shrink-0 flex justify-between">
                          <span>{s.label}</span>
                          <span className="font-semibold text-gray-700">{s.count}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
