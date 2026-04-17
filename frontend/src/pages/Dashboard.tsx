import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsAPI, analyticsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Project, EqualizationResponse } from '../types'
import { TIPO_OBRA_LABELS, STATUS_LABELS, formatBRL } from '../types'
import {
  FolderOpen, Table2, FileText, TrendingUp, Plus,
  ArrowRight, BarChart3, Clock, ShieldCheck, Target,
  LineChart, Building2, ChevronRight, Award, Zap,
  Scissors, Trophy, Star, BookOpen, Download, ExternalLink,
} from 'lucide-react'
import GuidedTour, { RestartTourButton } from '../components/GuidedTour'
import { ESTADOS, ANOS, getPaginaUrl, getDownloadUrl } from './Sicro'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO:    'bg-gray-100 text-gray-500',
  EM_ANDAMENTO:'bg-blue-50 text-blue-700 border border-blue-200',
  CONCLUIDO:   'bg-green-50 text-green-700 border border-green-200',
  ARQUIVADO:   'bg-gray-100 text-gray-400',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function BenchmarkRow({
  icon: Icon, value, title, description,
}: {
  icon: React.ElementType; value: string; title: string; description: string
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-lg font-bold text-gray-900">{value}</span>
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function NavCard({
  to, icon: Icon, label, description, disabled,
}: {
  to: string; icon: React.ElementType; label: string; description: string; disabled?: boolean
}) {
  const base = 'group block bg-white border rounded-xl p-5 transition-all'
  if (disabled) {
    return (
      <div className={`${base} border-gray-200 opacity-40 cursor-not-allowed`}>
        <Icon size={18} className="text-gray-400 mb-3" />
        <p className="text-sm font-semibold text-gray-600">{label}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>
      </div>
    )
  }
  return (
    <Link to={to} className={`${base} border-gray-200 hover:border-blue-300 hover:shadow-sm`}>
      <Icon size={18} className="text-blue-600 mb-3" />
      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{label}</p>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>
      <div className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        Acessar <ChevronRight size={11} />
      </div>
    </Link>
  )
}

// ── Cherry Pick Card ──────────────────────────────────────────────────────────

interface CherryItem {
  numero_item: string
  descricao: string
  bestSupplier: string
  economia: number
  economyPct: number
}

interface SupplierWin {
  empresa: string
  wins: number
  winPct: number
}

interface CherryData {
  cherryTotal: number
  mediaTotal: number
  economy: number
  economyPct: number
  topItems: CherryItem[]
  topSuppliers: SupplierWin[]
  totalItems: number
}

function CherryPickCard({ data, project }: { data: CherryData; project: Project }) {
  return (
    <div className="bg-white border border-violet-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-violet-100 bg-violet-50/40">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Scissors size={15} className="text-violet-600" />
            Cherry Pick
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {project.nome} · menor preço por linha · {data.totalItems} itens
          </p>
        </div>
        <Link
          to={`/projetos/${project.id}/analises`}
          className="text-xs text-violet-600 font-medium hover:underline flex items-center gap-1"
        >
          Ver análise completa <ChevronRight size={11} />
        </Link>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">Total Cherry Pick</p>
          <p className="text-xl font-bold text-violet-700">{formatBRL(data.cherryTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">mínimo teórico</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">Média das propostas</p>
          <p className="text-xl font-bold text-gray-700">{formatBRL(data.mediaTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">sem cherry pick</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">Economia potencial</p>
          <p className="text-xl font-bold text-green-600">{formatBRL(data.economy)}</p>
          <p className="text-xs text-green-500 font-medium mt-0.5">
            {data.economyPct.toFixed(1)}% de redução
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Top itens */}
        {data.topItems.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Star size={11} className="text-amber-500" /> Top itens por economia
            </p>
            <div className="space-y-2.5">
              {data.topItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-gray-300 w-6 flex-shrink-0 pt-0.5">{item.numero_item}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate leading-tight">{item.descricao}</p>
                    <p className="text-xs text-violet-500 mt-0.5">{item.bestSupplier}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-green-600">−{item.economyPct.toFixed(0)}%</p>
                    <p className="text-xs text-gray-400">{formatBRL(item.economia)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fornecedores */}
        {data.topSuppliers.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Trophy size={11} className="text-amber-500" /> Fornecedores no cherry pick
            </p>
            <div className="space-y-3">
              {data.topSuppliers.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 truncate max-w-[160px]">{s.empresa}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {s.wins} itens ({s.winPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-violet-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(s.winPct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              Percentual de itens em que cada fornecedor oferece o menor preço unitário.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()

  const { data: _rawProjects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then((r) => r.data),
  })
  const projects: Project[] = Array.isArray(_rawProjects) ? _rawProjects : []

  const total        = projects.length
  const emAndamento  = projects.filter((p) => p.status === 'EM_ANDAMENTO').length
  const concluidos   = projects.filter((p) => p.status === 'CONCLUIDO').length
  const totalProps   = projects.reduce((acc, p) => acc + p.total_proposals, 0)
  const totalItens   = projects.reduce((acc, p) => acc + p.total_pq_items, 0)
  const mediaProp    = total > 0 ? (totalProps / total).toFixed(1) : '—'
  const latest       = projects[0]

  // Projeto com propostas para cherry pick (o mais recente que tenha propostas)
  const latestWithProposals = projects.find((p) => p.total_proposals > 0 && p.total_pq_items > 0)

  const { data: eqRaw } = useQuery<EqualizationResponse>({
    queryKey: ['equalization', latestWithProposals?.id],
    queryFn: () => analyticsAPI.getEqualization(latestWithProposals!.id).then((r) => r.data),
    enabled: !!latestWithProposals,
  })

  const cherryData = useMemo((): CherryData | null => {
    if (!eqRaw) return null
    const items = Array.isArray(eqRaw.items) ? eqRaw.items : []
    const proposals = Array.isArray(eqRaw.proposals) ? eqRaw.proposals : []
    if (items.length === 0 || proposals.length === 0) return null

    let cherryTotal = 0
    let mediaTotal = 0
    const winnerCounts: Record<string, number> = {}
    const cherryItems: CherryItem[] = []

    for (const item of items) {
      const q = item.quantidade ?? 0

      if (item.preco_minimo != null && q > 0) cherryTotal += item.preco_minimo * q
      if (item.preco_medio  != null && q > 0) mediaTotal  += item.preco_medio  * q

      // Qual proposta tem o menor preço neste item?
      let minPrice = Infinity
      let minPropId: string | null = null
      for (const [propId, price] of Object.entries(item.precos)) {
        if (price != null && price < minPrice) { minPrice = price; minPropId = propId }
      }
      if (minPropId) winnerCounts[minPropId] = (winnerCounts[minPropId] ?? 0) + 1

      if (item.preco_minimo != null && item.preco_medio != null && q > 0) {
        const economia = (item.preco_medio - item.preco_minimo) * q
        if (economia > 0) {
          const prop = proposals.find((p) => String(p.id) === minPropId)
          cherryItems.push({
            numero_item: item.numero_item,
            descricao:   item.descricao,
            bestSupplier: prop?.empresa ?? '—',
            economia,
            economyPct: ((item.preco_medio - item.preco_minimo) / item.preco_medio) * 100,
          })
        }
      }
    }

    cherryItems.sort((a, b) => b.economia - a.economia)

    const topSuppliers: SupplierWin[] = Object.entries(winnerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([propId, wins]) => {
        const prop = proposals.find((p) => String(p.id) === propId)
        return {
          empresa: prop?.empresa ?? `Proposta ${propId}`,
          wins,
          winPct: Math.round((wins / items.length) * 100),
        }
      })

    const economy    = mediaTotal - cherryTotal
    const economyPct = mediaTotal > 0 ? (economy / mediaTotal) * 100 : 0

    return {
      cherryTotal,
      mediaTotal,
      economy,
      economyPct,
      topItems: cherryItems.slice(0, 5),
      topSuppliers,
      totalItems: items.length,
    }
  }, [eqRaw])

  return (
    <div className="min-h-screen bg-gray-50">
      <GuidedTour />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Cabeçalho ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting()}, {user?.nome?.split(' ')[0]}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Visão geral dos seus processos de equalização
            </p>
            <div className="mt-1">
              <RestartTourButton />
            </div>
          </div>
          <Link
            to="/projetos"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={15} /> Novo Projeto
          </Link>
        </div>

        {/* ── Métricas ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Projetos"
            value={total}
            sub={emAndamento > 0 ? `${emAndamento} em andamento` : 'Nenhum em andamento'}
          />
          <MetricCard
            label="Propostas recebidas"
            value={totalProps}
            sub={concluidos > 0 ? `${concluidos} projeto${concluidos > 1 ? 's' : ''} concluído${concluidos > 1 ? 's' : ''}` : undefined}
          />
          <MetricCard
            label="Itens de PQ cadastrados"
            value={totalItens}
          />
          <MetricCard
            label="Média propostas / projeto"
            value={mediaProp}
            sub="Referência: 3 a 5 propostas"
          />
        </div>

        {/* ── Layout principal: conteúdo + sidebar ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">

            {/* Projetos recentes */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Projetos recentes</h2>
                <Link
                  to="/projetos"
                  className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                >
                  Ver todos <ChevronRight size={11} />
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="py-14 text-center px-6">
                  <FolderOpen size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-600 mb-1">Nenhum projeto criado</p>
                  <p className="text-xs text-gray-400 mb-5">
                    Crie seu primeiro projeto para começar a equalizar propostas comerciais.
                  </p>
                  <Link to="/projetos" className="btn-primary text-sm mx-auto">
                    <Plus size={14} /> Criar projeto
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {projects.slice(0, 7).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <FolderOpen size={14} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {TIPO_OBRA_LABELS[p.tipo_obra]}
                          {p.numero_licitacao && ` · TR ${p.numero_licitacao}`}
                          {' · '}{p.total_pq_items} itens · {p.total_proposals} proposta{p.total_proposals !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Link
                          to={`/projetos/${p.id}/equalizacao`}
                          className="text-xs text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
                        >
                          Equalizar <ArrowRight size={10} />
                        </Link>
                        <Link
                          to={`/projetos/${p.id}/analises`}
                          className="text-xs text-gray-500 font-medium px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-1"
                        >
                          Análises <ArrowRight size={10} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cherry Pick */}
            {cherryData && latestWithProposals && (
              <CherryPickCard data={cherryData} project={latestWithProposals} />
            )}

            {/* Acesso rápido */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Acesso rápido
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <NavCard
                  to="/projetos"
                  icon={FolderOpen}
                  label="Projetos"
                  description="Gerencie processos e acompanhe o status."
                />
                <NavCard
                  to={latest ? `/projetos/${latest.id}/pq` : '/projetos'}
                  icon={Table2}
                  label="Planilha PQ"
                  description="Monte quantitativos e importe via Excel."
                  disabled={!latest}
                />
                <NavCard
                  to={latest ? `/projetos/${latest.id}/equalizacao` : '/projetos'}
                  icon={Building2}
                  label="Equalização"
                  description="Compare propostas e identifique desvios por item."
                  disabled={!latest}
                />
                <NavCard
                  to={latest ? `/projetos/${latest.id}/analises` : '/projetos'}
                  icon={LineChart}
                  label="Análises"
                  description="Curva ABC, Pareto e comparativos visuais."
                  disabled={!latest}
                />
              </div>
            </div>
          </div>

          {/* Sidebar direita */}
          <div className="space-y-6">

            {/* SICRO Card */}
            {(() => {
              const latestAno = ANOS[0]
              const latestPeriodo = latestAno.periodos[latestAno.periodos.length - 1]
              return (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <BookOpen size={15} className="text-blue-600" />
                      <h2 className="text-sm font-semibold text-gray-800">SICRO — Preços DNIT</h2>
                    </div>
                    <Link
                      to="/sicro"
                      className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                    >
                      Ver todos <ChevronRight size={11} />
                    </Link>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Último período disponível:{' '}
                      <span className="font-semibold text-gray-700">
                        {latestPeriodo.label} / {latestAno.ano}
                      </span>
                    </p>
                    {ESTADOS.map((e) => {
                      const dlUrl = getDownloadUrl(e, latestAno.ano, latestPeriodo)
                      const pgUrl = getPaginaUrl(e, latestAno.ano, latestPeriodo.slug)
                      return (
                        <div key={e.sigla} className={`rounded-lg border p-3 ${e.corBg}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black ${e.cor}`}>{e.sigla}</span>
                              <span className="text-xs text-gray-600 font-medium">{e.nome}</span>
                            </div>
                            <span className="text-[10px] text-gray-400">Região {e.regiao}</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={pgUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-700 px-2 py-1 rounded bg-white border border-gray-200 hover:border-blue-300 transition-colors"
                            >
                              <ExternalLink size={10} />
                              DNIT
                            </a>
                            {dlUrl && (
                              <a
                                href={dlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-green-700 hover:text-green-800 px-2 py-1 rounded bg-white border border-green-200 hover:border-green-400 transition-colors"
                              >
                                <Download size={10} />
                                .7z
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Benchmarks do setor */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Impacto da equalização estruturada</h2>
                <p className="text-xs text-gray-400 mt-0.5">Benchmarks do setor de grandes obras</p>
              </div>
              <div className="px-5">
                <BenchmarkRow
                  icon={Target}
                  value="12% – 22%"
                  title="Economia identificada"
                  description="Sobrepreço médio revelado em processos com análise comparativa estruturada."
                />
                <BenchmarkRow
                  icon={Clock}
                  value="8h → 40min"
                  title="Tempo de equalização"
                  description="10 propostas com 200 itens: manual vs. software."
                />
                <BenchmarkRow
                  icon={ShieldCheck}
                  value="95%"
                  title="Redução de erros"
                  description="Eliminação de erros de transcrição e cálculo na análise manual."
                />
                <BenchmarkRow
                  icon={Award}
                  value="80 / 20"
                  title="Regra da Curva ABC"
                  description="20% dos itens concentram 80% do valor. Negociar esses itens gera impacto máximo."
                />
                <BenchmarkRow
                  icon={BarChart3}
                  value="1 em 3"
                  title="Propostas com desvio crítico"
                  description="Proporção média de propostas com ao menos um item acima de 30% da referência."
                />
              </div>
            </div>

            {/* Dica contextual */}
            {total > 0 && totalProps === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Zap size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Próximo passo</p>
                    <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                      Você já tem um projeto. Adicione propostas na aba <strong>Equalização</strong> para começar a análise.
                    </p>
                    {latest && (
                      <Link
                        to={`/projetos/${latest.id}/equalizacao`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 mt-2 hover:underline"
                      >
                        Ir para equalização <ArrowRight size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Dica cherry pick */}
            {!latestWithProposals && total > 0 && totalItens > 0 && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Scissors size={15} className="text-violet-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-violet-800">Ative o Cherry Pick</p>
                    <p className="text-xs text-violet-600 mt-1 leading-relaxed">
                      Adicione pelo menos 2 propostas para ver o menor preço por linha e a economia potencial em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
