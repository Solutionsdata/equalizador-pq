import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { monitoringAPI } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Database, Users, FolderOpen, Activity, RefreshCw,
  TrendingUp, Server, Table2, Eye, Clock, Building2,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { TIPO_OBRA_LABELS, STATUS_LABELS } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  if (b >= 1024)        return `${(b / 1024).toFixed(1)} KB`
  return `${b} B`
}

function fmtDt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}

const PAGE_ICONS: Record<string, string> = {
  'Dashboard':            '📊',
  'Projetos':             '📁',
  'SICRO':                '📖',
  'Planilha PQ':          '📋',
  'Equalização':          '⚖️',
  'Análises':             '📈',
  'Entrada de Proposta':  '📝',
  'Admin — Usuários':     '👥',
  'Admin — Monitoramento':'🖥️',
}

// ── sub-componentes ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color = 'blue',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'violet' | 'amber' | 'red'
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    violet: 'bg-violet-50 text-violet-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={17} />
        </div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

// ── página ────────────────────────────────────────────────────────────────────

export default function AdminMonitoring() {
  const [days, setDays] = useState(30)
  const [projectFilter, setProjectFilter] = useState('')
  const [projectsExpanded, setProjectsExpanded] = useState(false)

  const refetchOpts = { refetchInterval: 60_000 }

  const { data: overview, refetch: refetchOverview, isFetching: loadingOv } =
    useQuery({ queryKey: ['mon-overview'], queryFn: () => monitoringAPI.overview().then(r => r.data), ...refetchOpts })

  const { data: dbStats, refetch: refetchDb, isFetching: loadingDb } =
    useQuery({ queryKey: ['mon-db'], queryFn: () => monitoringAPI.db().then(r => r.data), ...refetchOpts })

  const { data: projects, refetch: refetchProjects } =
    useQuery({ queryKey: ['mon-projects'], queryFn: () => monitoringAPI.projects().then(r => r.data) })

  const { data: activity, refetch: refetchActivity, isFetching: loadingAct } =
    useQuery({ queryKey: ['mon-activity', days], queryFn: () => monitoringAPI.activity(days).then(r => r.data) })

  function refetchAll() {
    refetchOverview(); refetchDb(); refetchProjects(); refetchActivity()
  }

  const isLoading = loadingOv || loadingDb || loadingAct

  // Projetos filtrados
  const filteredProjects = (projects ?? []).filter((p: any) => {
    if (!projectFilter) return true
    const q = projectFilter.toLowerCase()
    return (
      p.nome.toLowerCase().includes(q) ||
      p.usuario.nome.toLowerCase().includes(q) ||
      p.usuario.email.toLowerCase().includes(q) ||
      (p.usuario.empresa ?? '').toLowerCase().includes(q)
    )
  })

  // Bar chart: uso da DB
  const dbUsoPct = dbStats?.uso_pct ?? 0
  const dbColor = dbUsoPct > 80 ? '#ef4444' : dbUsoPct > 60 ? '#f59e0b' : '#22c55e'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitoramento</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Banco de dados · Projetos · Atividade de usuários
            </p>
          </div>
          <button
            onClick={refetchAll}
            disabled={isLoading}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 bg-white px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* ── Cards de resumo ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}     label="Usuários"        value={overview?.total_users ?? '—'}    sub={`${overview?.users_ativos ?? 0} ativos`}        color="blue" />
          <StatCard icon={FolderOpen} label="Projetos"       value={overview?.total_projects ?? '—'} sub={`${overview?.total_proposals ?? 0} propostas`}  color="violet" />
          <StatCard icon={Eye}       label="Acessos hoje"    value={overview?.acessos_hoje ?? '—'}   sub={`${overview?.usuarios_hoje ?? 0} usuário(s)`}   color="green" />
          <StatCard icon={Table2}    label="Itens de PQ"     value={overview?.total_items ?? '—'}    color="amber" />
        </div>

        {/* ── Banco de dados ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Database size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-800">Banco de Dados — Neon PostgreSQL</h2>
            <span className="ml-auto text-xs text-gray-400">Free tier: 500 MB</span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Barra de uso */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700">
                  Armazenamento: {dbStats ? `${dbStats.db_mb} MB` : '—'} / 500 MB
                </span>
                <span className="text-sm font-semibold" style={{ color: dbColor }}>
                  {dbStats?.uso_pct ?? '—'}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(dbStats?.uso_pct ?? 0, 100)}%`, backgroundColor: dbColor }}
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {dbUsoPct > 80
                  ? <><AlertTriangle size={12} className="text-red-500" /><span className="text-xs text-red-600 font-medium">Atenção: uso alto</span></>
                  : <><CheckCircle2 size={12} className="text-green-500" /><span className="text-xs text-green-600">Uso normal</span></>
                }
              </div>
            </div>

            {/* Tabelas */}
            {dbStats?.tabelas?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-gray-400 font-medium">Tabela</th>
                      <th className="text-right pb-2 text-gray-400 font-medium">Linhas</th>
                      <th className="text-right pb-2 text-gray-400 font-medium">Tamanho</th>
                      <th className="pb-2 pl-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {dbStats.tabelas.map((t: any) => {
                      const pct = dbStats.db_bytes > 0
                        ? Math.round((t.bytes / dbStats.db_bytes) * 100)
                        : 0
                      return (
                        <tr key={t.tabela} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 font-mono text-gray-700">{t.tabela}</td>
                          <td className="py-2 text-right text-gray-500">{t.linhas.toLocaleString('pt-BR')}</td>
                          <td className="py-2 text-right text-gray-500">{t.tamanho}</td>
                          <td className="py-2 pl-3 w-24">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Atividade diária ──────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-green-600" />
              <h2 className="text-sm font-semibold text-gray-800">Acessos diários</h2>
            </div>
            <div className="flex gap-1">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    days === d
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-4">
            {activity?.daily?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activity.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="dia" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name === 'total' ? 'Acessos' : 'Usuários únicos']}
                    labelFormatter={(l) => `Data: ${fmtDate(l)}`}
                  />
                  <Bar dataKey="total"    fill="#3b82f6" radius={[3,3,0,0]} name="total" />
                  <Bar dataKey="usuarios" fill="#a5b4fc" radius={[3,3,0,0]} name="usuarios" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                Sem dados de atividade ainda
              </div>
            )}
            <div className="flex gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Acessos totais
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-300 inline-block" /> Usuários únicos
              </span>
            </div>
          </div>
        </div>

        {/* ── Grid: páginas + usuários ativos ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Páginas mais acessadas */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Activity size={15} className="text-violet-600" />
              <h2 className="text-sm font-semibold text-gray-800">Páginas mais acessadas</h2>
              <span className="ml-auto text-xs text-gray-400">últimos {days} dias</span>
            </div>
            <div className="px-5 py-3">
              {activity?.top_pages?.length > 0 ? (
                <div className="space-y-2.5">
                  {activity.top_pages.map((p: any, i: number) => {
                    const max = activity.top_pages[0].total
                    const pct = Math.round((p.total / max) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700">
                            {PAGE_ICONS[p.pagina] ?? '📄'} {p.pagina}
                          </span>
                          <span className="text-xs font-semibold text-gray-600 ml-2">{p.total}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-6 text-center">Sem dados ainda</p>
              )}
            </div>
          </div>

          {/* Usuários mais ativos */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Users size={15} className="text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-800">Usuários mais ativos</h2>
              <span className="ml-auto text-xs text-gray-400">últimos {days} dias</span>
            </div>
            <div className="divide-y divide-gray-50">
              {activity?.top_users?.length > 0 ? (
                activity.top_users.map((u: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{u.nome}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.empresa ?? u.email}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 flex-shrink-0">
                      {u.total} acesso{u.total !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 py-6 text-center px-5">Sem dados ainda</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Todos os projetos ─────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setProjectsExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={15} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">
                Todos os projetos — {(projects ?? []).length} total
              </h2>
            </div>
            {projectsExpanded
              ? <ChevronUp size={15} className="text-gray-400" />
              : <ChevronDown size={15} className="text-gray-400" />}
          </button>

          {projectsExpanded && (
            <>
              <div className="px-5 py-3 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Filtrar por nome, usuário, empresa…"
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-2.5 text-gray-400 font-medium">Projeto</th>
                      <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Usuário</th>
                      <th className="text-left px-3 py-2.5 text-gray-400 font-medium hidden lg:table-cell">Empresa</th>
                      <th className="text-left px-3 py-2.5 text-gray-400 font-medium hidden md:table-cell">Tipo</th>
                      <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Status</th>
                      <th className="text-right px-3 py-2.5 text-gray-400 font-medium">Props</th>
                      <th className="text-right px-3 py-2.5 text-gray-400 font-medium">Itens</th>
                      <th className="text-left px-5 py-2.5 text-gray-400 font-medium hidden xl:table-cell">Criado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProjects.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800 max-w-[200px] truncate">{p.nome}</p>
                          {p.numero_licitacao && (
                            <p className="text-[10px] text-gray-400 mt-0.5">TR {p.numero_licitacao}</p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-gray-700 truncate max-w-[120px]">{p.usuario.nome}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{p.usuario.email}</p>
                        </td>
                        <td className="px-3 py-3 text-gray-500 hidden lg:table-cell max-w-[100px] truncate">
                          {p.usuario.empresa ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-500 hidden md:table-cell">
                          {TIPO_OBRA_LABELS[p.tipo_obra as keyof typeof TIPO_OBRA_LABELS] ?? p.tipo_obra}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600 font-medium">{p.total_proposals}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{p.total_items}</td>
                        <td className="px-5 py-3 text-gray-400 hidden xl:table-cell">
                          {fmtDate(p.created_at.slice(0, 10))}/{p.created_at.slice(0, 4)}
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                          Nenhum projeto encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ── Feed de acessos recentes ──────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Clock size={15} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Acessos recentes</h2>
            <span className="ml-auto text-xs text-gray-400">últimos {days} dias · máx 200</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {activity?.logs?.length > 0 ? (
              activity.logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                    {log.usuario?.nome?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-700">{log.usuario?.nome ?? 'Usuário removido'}</span>
                    <span className="text-xs text-gray-400 mx-1.5">→</span>
                    <span className="text-xs text-gray-600">
                      {PAGE_ICONS[log.pagina] ?? '📄'} {log.pagina}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400">{fmtDt(log.timestamp)}</p>
                    {log.ip && <p className="text-[10px] text-gray-300 font-mono">{log.ip}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-400 text-sm">
                Nenhum acesso registrado ainda
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO:     'bg-gray-100 text-gray-500',
  EM_ANDAMENTO: 'bg-blue-50 text-blue-700',
  CONCLUIDO:    'bg-green-50 text-green-700',
  ARQUIVADO:    'bg-gray-100 text-gray-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
    </span>
  )
}
