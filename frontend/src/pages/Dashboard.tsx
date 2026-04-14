import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Project } from '../types'
import { TIPO_OBRA_LABELS, STATUS_LABELS } from '../types'
import {
  FolderOpen, Table2, FileText, TrendingUp, Plus,
  ArrowRight, BarChart3, Clock, ShieldCheck, Target,
  LineChart, Building2, ChevronRight, Award, Zap,
} from 'lucide-react'
import GuidedTour, { RestartTourButton } from '../components/GuidedTour'

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

// ── Página ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then((r) => r.data),
  })

  const total        = projects.length
  const emAndamento  = projects.filter((p) => p.status === 'EM_ANDAMENTO').length
  const concluidos   = projects.filter((p) => p.status === 'CONCLUIDO').length
  const totalProps   = projects.reduce((acc, p) => acc + p.total_proposals, 0)
  const totalItens   = projects.reduce((acc, p) => acc + p.total_pq_items, 0)
  const mediaProp    = total > 0 ? (totalProps / total).toFixed(1) : '—'
  const latest       = projects[0]

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
                          {p.numero_licitacao && ` · ${p.numero_licitacao}`}
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
                  description="Gerencie processos licitatórios e acompanhe o status."
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
          </div>
        </div>
      </div>
    </div>
  )
}
