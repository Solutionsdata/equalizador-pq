import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analyticsAPI, proposalsAPI, downloadBlob } from '../services/api'
import type { BaselineEntry } from '../types'
import { getTipoObraLabel, TIPO_OBRA_LABELS, formatBRL, formatNumber } from '../types'
import toast from 'react-hot-toast'
import {
  Trophy, FileDown, TrendingUp, Building2, Users, MapPin,
  BarChart2, Layers, ArrowUpRight, XCircle, X, Check,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from 'recharts'

// ── Paleta ────────────────────────────────────────────────────────────────────
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#e11d48', '#0891b2', '#c2410c']
const TIPO_COLORS: Record<string, string> = {
  INFRAESTRUTURA: '#2563eb',
  EDIFICACAO: '#16a34a',
  OBRA_DE_ARTE: '#9333ea',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function kpi(n: number) { return formatBRL(n) }

function toYM(iso: string) {
  try { return iso.slice(0, 7) } catch { return iso }
}
function fmtYM(ym: string) {
  const [y, m] = ym.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[Number(m) - 1]}/${y}`
}

const CustomTooltipBRL = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatBRL(p.value)}</p>
      ))}
    </div>
  )
}

export default function Baseline() {
  const qc = useQueryClient()
  const [filterTR, setFilterTR] = useState('')
  const [filterEmpresa, setFilterEmpresa] = useState('')
  const [filterYM, setFilterYM] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null)

  const { data: entries = [], isLoading } = useQuery<BaselineEntry[]>({
    queryKey: ['baseline'],
    queryFn: () => analyticsAPI.getBaseline().then((r) => r.data),
  })

  const unsetWinnerMutation = useMutation({
    mutationFn: (proposalId: number) => proposalsAPI.unsetWinner(proposalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baseline'] })
      qc.invalidateQueries({ queryKey: ['proposals'] })
      toast.success('Premiação cancelada.')
      setCancelConfirm(null)
    },
    onError: () => toast.error('Erro ao cancelar premiação'),
  })

  // ── Filtro ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => entries.filter((e) => {
    if (filterTR && !(e.numero_licitacao ?? '').toLowerCase().includes(filterTR.toLowerCase())) return false
    if (filterEmpresa && !e.empresa.toLowerCase().includes(filterEmpresa.toLowerCase())) return false
    if (filterYM && toYM(e.data_premiacao) !== filterYM) return false
    return true
  }), [entries, filterTR, filterEmpresa, filterYM])

  // ── Meses disponíveis ───────────────────────────────────────────────────────
  const availableYM = useMemo(() =>
    [...new Set(entries.map((e) => toYM(e.data_premiacao)))].sort().reverse()
  , [entries])

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalValor = filtered.reduce((s, e) => s + e.valor_total, 0)
  const ticketMedio = filtered.length ? totalValor / filtered.length : 0
  const proponentes = new Set(filtered.map((e) => e.empresa)).size

  // ── Gráfico 1: evolução mensal ──────────────────────────────────────────────
  const evolucaoData = useMemo(() => {
    const map: Record<string, number> = {}
    ;[...entries]
      .sort((a, b) => a.data_premiacao.localeCompare(b.data_premiacao))
      .forEach((e) => {
        const ym = toYM(e.data_premiacao)
        map[ym] = (map[ym] ?? 0) + e.valor_total
      })
    let acumulado = 0
    return Object.entries(map).map(([ym, val]) => {
      acumulado += val
      return { name: fmtYM(ym), mensal: val, acumulado }
    })
  }, [entries])

  // ── Gráfico 2: por tipo de obra ─────────────────────────────────────────────
  const tipoData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach((e) => { map[e.tipo_obra] = (map[e.tipo_obra] ?? 0) + e.valor_total })
    return Object.entries(map).map(([tipo, valor]) => ({
      name: TIPO_OBRA_LABELS[tipo as keyof typeof TIPO_OBRA_LABELS] ?? tipo,
      valor,
      fill: TIPO_COLORS[tipo] ?? '#64748b',
    }))
  }, [filtered])

  // ── Gráfico 3: top proponentes ──────────────────────────────────────────────
  const proponentesData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach((e) => { map[e.empresa] = (map[e.empresa] ?? 0) + e.valor_total })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, valor]) => ({ name: name.length > 28 ? name.slice(0, 26) + '…' : name, valor }))
  }, [filtered])

  // ── Dados de custo por km ───────────────────────────────────────────────────
  const kmEntries = filtered.filter((e) => e.extensao_km)
  const kmData = useMemo(() => kmEntries.map((e) => ({
    name: e.project_nome.length > 22 ? e.project_nome.slice(0, 20) + '…' : e.project_nome,
    'R$/km': Math.round(e.valor_total / e.extensao_km!),
    valor: e.valor_total,
    km: e.extensao_km,
  })), [kmEntries])

  // R$/km por disciplina (média ponderada de todos projetos com km)
  const kmDisciplinaData = useMemo(() => {
    if (!kmEntries.length) return []
    const map: Record<string, { total: number; km: number }> = {}
    kmEntries.forEach((e) => {
      e.items.forEach((item) => {
        const disc = item.disciplina || 'Sem disciplina'
        if (!map[disc]) map[disc] = { total: 0, km: 0 }
        map[disc].total += item.preco_total
        map[disc].km += e.extensao_km!
      })
    })
    return Object.entries(map)
      .map(([disc, { total, km }]) => ({ name: disc, 'R$/km': Math.round(total / km) }))
      .sort((a, b) => b['R$/km'] - a['R$/km'])
      .slice(0, 10)
  }, [kmEntries])

  // R$/km por categoria
  const kmCategoriaData = useMemo(() => {
    if (!kmEntries.length) return []
    const map: Record<string, { total: number; km: number }> = {}
    kmEntries.forEach((e) => {
      e.items.forEach((item) => {
        const cat = item.categoria || 'Sem categoria'
        if (!map[cat]) map[cat] = { total: 0, km: 0 }
        map[cat].total += item.preco_total
        map[cat].km += e.extensao_km!
      })
    })
    return Object.entries(map)
      .map(([cat, { total, km }]) => ({ name: cat, 'R$/km': Math.round(total / km) }))
      .sort((a, b) => b['R$/km'] - a['R$/km'])
      .slice(0, 10)
  }, [kmEntries])

  async function handleExport() {
    const tid = toast.loading('Gerando Excel…')
    try {
      const res = await analyticsAPI.exportBaseline()
      downloadBlob(res.data, 'baseline_contratos.xlsx')
      toast.success('Exportado!', { id: tid })
    } catch {
      toast.error('Erro ao exportar', { id: tid })
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando baseline…</div>

  return (
    <div className="page">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy size={24} className="text-yellow-500" />
            Baseline — Histórico de Contratos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Banco de dados de todas as propostas premiadas · comparativo histórico de valores
          </p>
        </div>
        <button onClick={handleExport} className="btn-primary">
          <FileDown size={16} /> Exportar Excel
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="card py-20 text-center">
          <Trophy size={52} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm mb-2">Nenhuma proposta vencedora registrada ainda.</p>
          <p className="text-gray-300 text-xs mb-4">
            Acesse um projeto → Equalização → marque um proponente como vencedor.
          </p>
          <Link to="/projetos" className="btn-primary mx-auto text-sm">
            Ir para Projetos
          </Link>
        </div>
      ) : (
        <>
          {/* ── KPI cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Contratos Premiados', value: String(filtered.length), icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50' },
              { label: 'Valor Total Contratado', value: kpi(totalValor), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Ticket Médio por Contrato', value: kpi(ticketMedio), icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Proponentes Únicos', value: String(proponentes), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((kpiItem) => (
              <div key={kpiItem.label} className="card p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${kpiItem.bg} flex items-center justify-center flex-shrink-0`}>
                  <kpiItem.icon size={20} className={kpiItem.color} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{kpiItem.label}</p>
                  <p className="text-xl font-bold text-gray-900 leading-tight">{kpiItem.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filtros ────────────────────────────────────────────────────── */}
          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nº Termo de Referência</label>
              <input className="input text-sm" placeholder="Buscar TR…" value={filterTR} onChange={(e) => setFilterTR(e.target.value)} />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Proponente</label>
              <input className="input text-sm" placeholder="Nome da empresa…" value={filterEmpresa} onChange={(e) => setFilterEmpresa(e.target.value)} />
            </div>
            <div className="min-w-36">
              <label className="block text-xs font-medium text-gray-500 mb-1">Ano / Mês</label>
              <select className="input text-sm" value={filterYM} onChange={(e) => setFilterYM(e.target.value)}>
                <option value="">Todos</option>
                {availableYM.map((ym) => (
                  <option key={ym} value={ym}>{fmtYM(ym)}</option>
                ))}
              </select>
            </div>
            {(filterTR || filterEmpresa || filterYM) && (
              <button onClick={() => { setFilterTR(''); setFilterEmpresa(''); setFilterYM('') }}
                className="btn-secondary text-xs self-end">
                Limpar
              </button>
            )}
            <p className="text-xs text-gray-400 self-end pb-2">{filtered.length} contrato(s)</p>
          </div>

          {/* ── Gráficos linha 1 ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Evolução temporal */}
            <div className="card p-5 xl:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-blue-500" />
                Evolução do Valor Contratado
              </h3>
              {evolucaoData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={evolucaoData}>
                    <defs>
                      <linearGradient id="gradMensal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1e6).toFixed(1)}M`} />
                    <Tooltip content={<CustomTooltipBRL />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="mensal" name="Valor Mensal" stroke="#3b82f6" fill="url(#gradMensal)" strokeWidth={2} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#16a34a" fill="url(#gradAcum)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Por tipo de obra — Pie */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Building2 size={15} className="text-purple-500" />
                Por Tipo de Obra
              </h3>
              {tipoData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Sem dados</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={tipoData} dataKey="valor" nameKey="name" cx="50%" cy="50%"
                        innerRadius={45} outerRadius={72} paddingAngle={3}>
                        {tipoData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {tipoData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                          <span className="text-gray-600">{d.name}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{formatBRL(d.valor)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Top Proponentes ────────────────────────────────────────────── */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Users size={15} className="text-indigo-500" />
              Top Proponentes por Valor Contratado
            </h3>
            {proponentesData.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-gray-300 text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, proponentesData.length * 36)}>
                <BarChart data={proponentesData} layout="vertical" margin={{ left: 8, right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1e6).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => formatBRL(v)} />
                  <Bar dataKey="valor" name="Valor Total" radius={[0, 4, 4, 0]}>
                    {proponentesData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Custo por km ───────────────────────────────────────────────── */}
          {kmEntries.length > 0 && (
            <>
              {/* Banner de destaque */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <MapPin size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Análise de Custo por Quilômetro</h3>
                    <p className="text-blue-200 text-xs">{kmEntries.length} projeto(s) com extensão cadastrada</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {kmEntries.map((e) => (
                    <div key={e.project_id} className="bg-white/10 rounded-xl p-3">
                      <p className="text-blue-200 text-[10px] font-medium uppercase tracking-wide truncate">{e.project_nome}</p>
                      <p className="text-xl font-bold mt-1">
                        {formatBRL(e.valor_total / e.extensao_km!)}
                        <span className="text-sm font-normal text-blue-200">/km</span>
                      </p>
                      <p className="text-blue-300 text-xs mt-0.5">{formatNumber(e.extensao_km, 3)} km · {formatBRL(e.valor_total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* R$/km por disciplina */}
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Layers size={15} className="text-blue-500" />
                    R$/km por Disciplina
                  </h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, kmDisciplinaData.length * 34)}>
                    <BarChart data={kmDisciplinaData} layout="vertical" margin={{ left: 8, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1e3).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => formatBRL(v)} labelFormatter={(l) => `${l}`} />
                      <Bar dataKey="R$/km" name="Custo R$/km" radius={[0, 4, 4, 0]}>
                        {kmDisciplinaData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* R$/km por categoria */}
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Layers size={15} className="text-green-500" />
                    R$/km por Categoria
                  </h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, kmCategoriaData.length * 34)}>
                    <BarChart data={kmCategoriaData} layout="vertical" margin={{ left: 8, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1e3).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => formatBRL(v)} />
                      <Bar dataKey="R$/km" name="Custo R$/km" radius={[0, 4, 4, 0]}>
                        {kmCategoriaData.map((_, i) => (
                          <Cell key={i} fill={['#16a34a', '#15803d', '#166534', '#14532d', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', '#f0fdf4'][i % 9]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ── Tabela de contratos ─────────────────────────────────────────── */}
          <div className="card overflow-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Trophy size={15} className="text-yellow-500" />
                Todos os Contratos Premiados
              </h3>
              <span className="text-xs text-gray-400">{filtered.length} registro(s)</span>
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold">Projeto</th>
                  <th className="px-4 py-3 text-left font-semibold">Nº TR</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Proponente</th>
                  <th className="px-4 py-3 text-right font-semibold">BDI (%)</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Extensão</th>
                  <th className="px-4 py-3 text-right font-semibold">R$/km</th>
                  <th className="px-4 py-3 text-center font-semibold">Premiação</th>
                  <th className="px-4 py-3 text-center font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const rk = e.extensao_km ? e.valor_total / e.extensao_km : null
                  const date = (() => {
                    try { return new Date(e.data_premiacao).toLocaleDateString('pt-BR') } catch { return '—' }
                  })()
                  const isOpen = expanded === e.proposal_id
                  return (
                    <React.Fragment key={e.proposal_id}>
                      <tr
                        className="border-t border-gray-100 hover:bg-yellow-50/40 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : e.proposal_id)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-48">
                          <div className="truncate" title={e.project_nome}>{e.project_nome}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{e.numero_licitacao || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: (TIPO_COLORS[e.tipo_obra] ?? '#6b7280') + '18', color: TIPO_COLORS[e.tipo_obra] ?? '#6b7280' }}>
                            {getTipoObraLabel(e.tipo_obra)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-40">
                          <div className="flex items-center gap-1.5">
                            <Trophy size={10} className="text-yellow-400 flex-shrink-0" />
                            <span className="truncate" title={e.empresa}>{e.empresa}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{e.bdi_global.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">{formatBRL(e.valor_total)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {e.extensao_km ? `${formatNumber(e.extensao_km, 3)} km` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 font-semibold">
                          {rk ? formatBRL(rk) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400">{date}</td>
                        <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {cancelConfirm === e.proposal_id ? (
                              <>
                                <span className="text-xs text-red-600 font-medium">Cancelar premiação?</span>
                                <button
                                  onClick={() => unsetWinnerMutation.mutate(e.proposal_id)}
                                  disabled={unsetWinnerMutation.isPending}
                                  className="text-red-600 hover:text-red-800"
                                  title="Confirmar cancelamento"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => setCancelConfirm(null)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Manter premiação"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setCancelConfirm(e.proposal_id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="Cancelar premiação"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                            <Link
                              to={`/projetos/${e.project_id}/equalizacao`}
                              className="text-blue-500 hover:text-blue-700"
                              title="Abrir equalização"
                            >
                              <ArrowUpRight size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Detalhe expandido */}
                      {isOpen && (
                        <tr key={`${e.proposal_id}-detail`}>
                          <td colSpan={10} className="px-4 pb-4 bg-yellow-50/30">
                            <div className="rounded-xl border border-yellow-200 overflow-hidden mt-1">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-gray-800 text-white">
                                    <th className="px-3 py-2 text-left">Item</th>
                                    <th className="px-3 py-2 text-left min-w-48">Descrição</th>
                                    <th className="px-3 py-2 text-center">Un</th>
                                    <th className="px-3 py-2 text-right">Qtd</th>
                                    <th className="px-3 py-2 text-left">Categoria</th>
                                    <th className="px-3 py-2 text-left">Disciplina</th>
                                    <th className="px-3 py-2 text-right">P. Unit.</th>
                                    <th className="px-3 py-2 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {e.items.map((item) => (
                                    <tr key={item.pq_item_id} className="border-t border-gray-100 hover:bg-white">
                                      <td className="px-3 py-1.5 font-mono text-gray-500">{item.numero_item}</td>
                                      <td className="px-3 py-1.5 text-gray-700 max-w-xs">
                                        <div className="truncate" title={item.descricao}>{item.descricao}</div>
                                      </td>
                                      <td className="px-3 py-1.5 text-center text-gray-500">{item.unidade}</td>
                                      <td className="px-3 py-1.5 text-right">{formatNumber(item.quantidade, 2)}</td>
                                      <td className="px-3 py-1.5 text-gray-400">{item.categoria || '—'}</td>
                                      <td className="px-3 py-1.5 text-gray-400">{item.disciplina || '—'}</td>
                                      <td className="px-3 py-1.5 text-right">
                                        {item.preco_unitario != null ? formatBRL(item.preco_unitario) : '—'}
                                      </td>
                                      <td className="px-3 py-1.5 text-right font-semibold text-green-700">
                                        {formatBRL(item.preco_total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                                    <td colSpan={7} className="px-3 py-2 text-right text-gray-600">TOTAL:</td>
                                    <td className="px-3 py-2 text-right text-green-700">{formatBRL(e.valor_total)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">
                Nenhum contrato corresponde aos filtros aplicados.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
