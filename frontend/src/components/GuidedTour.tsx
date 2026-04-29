import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, ArrowRight, ArrowLeft, FolderPlus, Table2,
  Building2, BarChart3, Trophy, CheckCircle2, Zap,
  GitBranch, Target, TrendingDown, Clock, Layers,
  PieChart, Upload, ChevronRight,
} from 'lucide-react'

const TOUR_KEY = 'tour_completed_v3'

// ── Step definitions ──────────────────────────────────────────────────────────
interface TourStep {
  badge: string
  badgeColor: string
  title: string
  sub: string
  visual: React.ReactNode
  tip?: string
  action?: { label: string; route: string }
}

function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-gray-400 w-16 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-500 font-semibold w-8 text-right shrink-0">{pct}%</span>
    </div>
  )
}

const STEPS: TourStep[] = [

  // ── 1 · Boas-vindas ────────────────────────────────────────────────────────
  {
    badge: 'Bem-vindo', badgeColor: 'bg-blue-600',
    title: 'Software de Equalização de Propostas',
    sub: 'A plataforma centraliza todo o processo de compras de grandes obras — do quantitativo à premiação — com rastreabilidade total e análises poderosas.',
    tip: 'Este tour leva menos de 2 minutos e mostra como tirar o máximo do sistema.',
    visual: (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-2 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-[9px] font-black text-red-400 uppercase tracking-wide mb-1">Sem o sistema</p>
            {['Excel por e-mail', 'Comparação manual', 'Sem histórico', 'Erros de escopo'].map(t => (
              <p key={t} className="text-[10px] text-red-600 flex items-center gap-1 py-0.5"><span className="font-black text-red-300">✕</span>{t}</p>
            ))}
          </div>
          <div className="p-2 bg-green-50 border border-green-100 rounded-xl">
            <p className="text-[9px] font-black text-green-500 uppercase tracking-wide mb-1">Com o sistema</p>
            {['Centralizado', 'Equalização auto.', 'Revisões versionadas', 'Rastreabilidade'].map(t => (
              <p key={t} className="text-[10px] text-green-700 flex items-center gap-1 py-0.5"><CheckCircle2 size={10} className="text-green-500 shrink-0" />{t}</p>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-2 bg-blue-50 border border-blue-100 rounded-xl">
          {[
            { icon: FolderPlus, l: 'Projetos',  c: 'text-blue-600' },
            { icon: Table2,     l: 'PQ',         c: 'text-cyan-600' },
            { icon: GitBranch,  l: 'Revisões',  c: 'text-violet-600' },
            { icon: Building2,  l: 'Propostas', c: 'text-amber-600' },
            { icon: BarChart3,  l: 'Análises',  c: 'text-emerald-600' },
            { icon: Trophy,     l: 'Baseline',  c: 'text-yellow-600' },
          ].map(({ icon: Icon, l, c }, i, a) => (
            <React.Fragment key={l}>
              <div className="flex flex-col items-center gap-0.5">
                <Icon size={14} className={c} />
                <span className="text-[9px] text-gray-500 font-semibold">{l}</span>
              </div>
              {i < a.length - 1 && <ChevronRight size={10} className="text-gray-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    ),
  },

  // ── 2 · Análises — Curva ABC ───────────────────────────────────────────────
  {
    badge: 'Análises', badgeColor: 'bg-emerald-600',
    title: 'Curva ABC & Pareto — onde está o dinheiro',
    sub: 'A análise mais importante do sistema. Classifica os itens do PQ pelo percentual acumulado do valor total, revelando onde focar a negociação.',
    tip: 'Estratégia: negocie agressivamente os 3–5 itens Classe A. Uma redução de 5% neles vale mais que zerar todos os itens C.',
    visual: (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          {[
            { cls: 'A', pct: 70, desc: '~15% dos itens · 70% do valor', color: 'bg-blue-600', badge: 'bg-blue-600 text-white' },
            { cls: 'B', pct: 20, desc: '~25% dos itens · 20% do valor', color: 'bg-indigo-400', badge: 'bg-indigo-100 text-indigo-700' },
            { cls: 'C', pct: 10, desc: '~60% dos itens · 10% do valor', color: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500' },
          ].map(({ cls, pct, desc, color, badge }) => (
            <div key={cls} className="flex items-center gap-2">
              <span className={`text-[10px] font-black w-5 h-5 rounded flex items-center justify-center shrink-0 ${badge}`}>{cls}</span>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-gray-400 w-32 shrink-0">{desc}</span>
            </div>
          ))}
        </div>
        <div className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px]">
          <p className="font-black text-gray-600 mb-1 uppercase tracking-wide text-[9px]">Exemplo — Top itens Classe A</p>
          {[
            { d: 'CBUQ Camada de rolamento', v: 'R$ 4,2M', p: '42%' },
            { d: 'Base de brita graduada',   v: 'R$ 2,1M', p: '63%' },
            { d: 'Sub-base compactada',      v: 'R$ 0,7M', p: '70%' },
          ].map(({ d, v, p }) => (
            <div key={d} className="flex justify-between py-0.5 border-b border-gray-100 last:border-0">
              <span className="text-gray-600 truncate mr-2">{d}</span>
              <span className="font-bold text-blue-700 shrink-0">{v} <span className="text-gray-400 font-normal">({p})</span></span>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 3 · Análises — Disciplinas e Revisões ──────────────────────────────────
  {
    badge: 'Análises', badgeColor: 'bg-violet-600',
    title: 'Disciplinas, Categorias e Revisões',
    sub: 'Além do Pareto, o sistema oferece 3 outras visões analíticas que revelam a composição do escopo e as mudanças entre versões do PQ.',
    tip: 'Preencha Disciplina, Categoria e Localidade em cada item do PQ — são esses campos que alimentam todos os gráficos.',
    visual: (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-2 bg-white border border-gray-100 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Layers size={12} className="text-violet-500" />
              <p className="text-[10px] font-black text-gray-700">Disciplinas</p>
            </div>
            <div className="flex flex-col gap-1">
              <MiniBar label="Civil"      pct={58} color="bg-blue-500" />
              <MiniBar label="Drenagem"   pct={22} color="bg-cyan-400" />
              <MiniBar label="Sinaliz."   pct={12} color="bg-amber-400" />
              <MiniBar label="Ambiental"  pct={8}  color="bg-emerald-400" />
            </div>
          </div>
          <div className="p-2 bg-white border border-gray-100 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <PieChart size={12} className="text-indigo-500" />
              <p className="text-[10px] font-black text-gray-700">Categorias</p>
            </div>
            <div className="flex flex-col gap-1">
              <MiniBar label="Pavimenta." pct={42} color="bg-indigo-500" />
              <MiniBar label="Terraplan."  pct={28} color="bg-purple-400" />
              <MiniBar label="OAE"        pct={18} color="bg-fuchsia-400" />
              <MiniBar label="Outros"     pct={12} color="bg-pink-300" />
            </div>
          </div>
        </div>
        <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <GitBranch size={12} className="text-amber-600" />
            <p className="text-[10px] font-black text-amber-800">Comparativo de Revisões — o que mudou</p>
          </div>
          <div className="flex gap-1.5">
            {[{ l: 'Adicionados', c: 'bg-green-100 text-green-700', n: '+3' }, { l: 'Removidos', c: 'bg-red-100 text-red-700', n: '-1' }, { l: 'Alterados', c: 'bg-amber-100 text-amber-700', n: '~5' }, { l: 'Inalterados', c: 'bg-gray-100 text-gray-500', n: '48' }].map(({ l, c, n }) => (
              <div key={l} className={`flex-1 text-center p-1.5 rounded-lg ${c}`}>
                <p className="text-sm font-black">{n}</p>
                <p className="text-[9px] font-semibold">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── 4 · Criar Projeto + PQ ────────────────────────────────────────────────
  {
    badge: 'Como usar', badgeColor: 'bg-cyan-600',
    title: 'Passo 1 — Crie o Projeto e monte a Planilha PQ',
    sub: 'Cada concorrência ou contrato vira um Projeto. Dentro dele você monta a Planilha de Quantitativos (PQ) com todos os itens do escopo.',
    tip: 'Use "Baixar Template" para obter o Excel pré-formatado, preencha e importe com 1 clique.',
    action: { label: 'Ir para Projetos', route: '/projetos' },
    visual: (
      <div className="flex flex-col gap-2">
        <div className="p-2 bg-white border border-gray-100 rounded-xl">
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400 mb-1.5">Novo Projeto — formulário</p>
          <div className="flex flex-col gap-1 text-[10px]">
            {[
              { l: 'Nome *', v: 'Recuperação Lote KM 45–120' },
              { l: 'SPE *',  v: 'Litoral Pioneiro ▾' },
              { l: 'Tipo *', v: 'Duplicação ▾' },
              { l: 'TR',     v: 'TR-2024/082' },
            ].map(({ l, v }) => (
              <div key={l} className="flex items-center gap-2">
                <span className="text-gray-400 w-12 shrink-0">{l}</span>
                <span className="flex-1 border border-gray-200 rounded px-1.5 py-0.5 text-gray-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-2 bg-white border border-gray-100 rounded-xl overflow-x-auto">
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400 mb-1.5">Planilha PQ — exemplo de item</p>
          <table className="w-full text-[9px]">
            <thead>
              <tr className="bg-blue-700 text-white">
                {['Item', 'Localidade', 'Disciplina', 'Categoria', 'Código', 'Descrição', 'Un.', 'Qtd', 'Preço RF'].map(h => (
                  <th key={h} className="px-1.5 py-1 text-left font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 bg-blue-50/30">
                {['1.1', 'KM 45–80', 'Civil', 'Pavimentação', 'PAV-003', 'CBUQ 5cm rolamento', 'm²', '50.000', 'R$ 85,00'].map((v, i) => (
                  <td key={i} className="px-1.5 py-1 text-gray-700 whitespace-nowrap">{v}</td>
                ))}
              </tr>
              <tr className="bg-white">
                {['1.2', 'KM 80–120', 'Civil', 'Terraplenagem', 'TER-001', 'Escavação mecânica', 'm³', '22.000', 'R$ 28,50'].map((v, i) => (
                  <td key={i} className="px-1.5 py-1 text-gray-600 whitespace-nowrap">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex gap-1.5">
          <div className="flex-1 flex items-center gap-1.5 p-2 bg-green-50 border border-green-100 rounded-xl">
            <Upload size={12} className="text-green-600 shrink-0" />
            <span className="text-[10px] font-semibold text-green-700">Importar via Excel</span>
          </div>
          <div className="flex-1 flex items-center gap-1.5 p-2 bg-blue-50 border border-blue-100 rounded-xl">
            <Table2 size={12} className="text-blue-600 shrink-0" />
            <span className="text-[10px] font-semibold text-blue-700">Inserir manualmente</span>
          </div>
        </div>
      </div>
    ),
  },

  // ── 5 · Revisões + Propostas ──────────────────────────────────────────────
  {
    badge: 'Como usar', badgeColor: 'bg-violet-600',
    title: 'Passo 2 — Crie Revisões e cadastre Propostas',
    sub: 'Antes de alterar o PQ, crie uma Revisão para preservar o histórico. Depois, cadastre uma Proposta por fornecedor e importe os preços via Excel.',
    tip: 'O template da proposta já vem com todos os itens do PQ preenchidos. O fornecedor só precisa preencher a coluna de preços.',
    visual: (
      <div className="flex flex-col gap-2">
        <div className="p-2 bg-white border border-gray-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <GitBranch size={12} className="text-violet-600" />
            <p className="text-[10px] font-black text-gray-700">Revisões — snapshots imutáveis do PQ</p>
          </div>
          <div className="flex items-center gap-1">
            {[
              { l: 'Rev 0', s: 'Edital', c: 'bg-blue-600' },
              { l: 'Rev 1', s: 'Addendum', c: 'bg-violet-600' },
              { l: 'Rev 2', s: 'Final', c: 'bg-indigo-600' },
            ].map((r, i, a) => (
              <React.Fragment key={r.l}>
                <div className="flex flex-col items-center">
                  <span className={`${r.c} text-white text-[9px] font-black px-2 py-0.5 rounded`}>{r.l}</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">{r.s}</span>
                </div>
                {i < a.length - 1 && <ArrowRight size={10} className="text-gray-300 shrink-0 mb-2" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="p-2 bg-white border border-gray-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 size={12} className="text-amber-600" />
            <p className="text-[10px] font-black text-gray-700">Tabela de equalização — 3 fornecedores</p>
          </div>
          <table className="w-full text-[9px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-1.5 py-1 text-left">Item</th>
                <th className="px-1.5 py-1 text-right">Ref.</th>
                <th className="px-1.5 py-1 text-right text-green-300">Empresa A</th>
                <th className="px-1.5 py-1 text-right">Empresa B</th>
                <th className="px-1.5 py-1 text-right">Empresa C</th>
              </tr>
            </thead>
            <tbody>
              {[
                { i: 'PAV-003', r: '4.250K', a: '3.910K', b: '4.580K', c: '4.120K', best: 'a' },
                { i: 'TER-001', r: '627K',   a: '650K',   b: '590K',   c: '610K',   best: 'b' },
              ].map(({ i, r, a, b, c, best }) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-1.5 py-1 font-mono font-semibold text-gray-700">{i}</td>
                  <td className="px-1.5 py-1 text-right text-gray-400">{r}</td>
                  <td className={`px-1.5 py-1 text-right font-bold ${best === 'a' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>{a}</td>
                  <td className={`px-1.5 py-1 text-right font-bold ${best === 'b' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>{b}</td>
                  <td className={`px-1.5 py-1 text-right font-bold ${best === 'c' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>{c}</td>
                </tr>
              ))}
              <tr className="bg-gray-800 text-white">
                <td className="px-1.5 py-1.5 font-black">TOTAL</td>
                <td className="px-1.5 py-1.5 text-right text-gray-400">4.877K</td>
                <td className="px-1.5 py-1.5 text-right font-black text-green-400 bg-green-900/30">4.560K ★</td>
                <td className="px-1.5 py-1.5 text-right text-gray-400">5.170K</td>
                <td className="px-1.5 py-1.5 text-right text-gray-400">4.730K</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },

  // ── 6 · Baseline + Dashboard ──────────────────────────────────────────────
  {
    badge: 'Finalizar', badgeColor: 'bg-amber-500',
    title: 'Passo 3 — Registre o vencedor e acompanhe no Dashboard',
    sub: 'Após a decisão, marque a proposta vencedora no Baseline. O Dashboard consolida automaticamente o histórico de saving, SLA e volume por SPE.',
    tip: 'Dashboard > SPE mostra o valor contratado por empresa do grupo — ideal para reuniões de diretoria.',
    action: { label: 'Ir para Baseline', route: '/baseline' },
    visual: (
      <div className="flex flex-col gap-2">
        <div className="p-2 bg-white border border-gray-100 rounded-xl">
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400 mb-1.5">Registrar premiação</p>
          <div className="flex flex-col gap-1.5 text-[10px]">
            {[
              { n: 1, t: 'Menu → Baseline', c: 'bg-amber-500' },
              { n: 2, t: 'Localizar proposta vencedora', c: 'bg-amber-500' },
              { n: 3, t: 'Clicar em Premiar + informar data', c: 'bg-amber-500' },
              { n: 4, t: 'Dashboard atualizado na hora', c: 'bg-amber-500' },
            ].map(({ n, t, c }) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${c} text-white text-[9px] font-black flex items-center justify-center shrink-0`}>{n}</div>
                <span className="text-gray-700">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { icon: Target,      label: 'Saving Orçamento', value: '8,4%', sub: 'vs. Ref. PQ', c: 'text-green-600 bg-green-50 border-green-100' },
            { icon: Clock,       label: 'SLA Médio',        value: '42d',  sub: 'até premiação', c: 'text-amber-600 bg-amber-50 border-amber-100' },
            { icon: TrendingDown,label: 'Saving Negoc.',    value: '3,2%', sub: 'Rev. 0 → final', c: 'text-blue-600 bg-blue-50 border-blue-100' },
            { icon: Trophy,      label: 'Volume Total',     value: 'R$ 12M', sub: 'contratos eq.', c: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          ].map(({ icon: Icon, label, value, sub, c }) => (
            <div key={label} className={`flex flex-col p-2 rounded-xl border ${c}`}>
              <div className="flex items-center gap-1 mb-1">
                <Icon size={11} />
                <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-base font-black leading-none">{value}</p>
              <p className="text-[9px] opacity-70 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
        <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl text-white text-center">
          <Zap size={14} className="mx-auto mb-1 text-yellow-300" />
          <p className="text-xs font-black">Você está pronto!</p>
          <p className="text-[10px] text-blue-200 mt-0.5">O Guia completo está sempre disponível no menu lateral → Ajuda</p>
        </div>
      </div>
    ),
  },
]

// ── TOUR Component ────────────────────────────────────────────────────────────
export default function GuidedTour() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(0)
  const [visible, setVisible] = useState(false)
  const [animDir, setAnimDir] = useState<'fwd' | 'bwd'>('fwd')

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      const t = setTimeout(() => setVisible(true), 700)
      return () => clearTimeout(t)
    }
  }, [])

  function finish() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
  }

  function go(dir: 'fwd' | 'bwd') {
    setAnimDir(dir)
    if (dir === 'fwd') {
      if (step < STEPS.length - 1) setStep(s => s + 1)
      else finish()
    } else {
      if (step > 0) setStep(s => s - 1)
    }
  }

  function handleAction(route: string) {
    finish()
    navigate(route)
  }

  if (!visible) return null

  const cur = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
        onClick={finish}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wide ${cur.badgeColor}`}>
              {cur.badge}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <button
            onClick={finish}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2">
          <h2 className="text-base font-black text-gray-900 leading-snug mb-1">{cur.title}</h2>
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{cur.sub}</p>

          {/* Visual */}
          <div className="mb-3">
            {cur.visual}
          </div>

          {/* Tip */}
          {cur.tip && (
            <div className="flex gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl mb-3">
              <Zap size={12} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">{cur.tip}</p>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-5 h-1.5 bg-blue-600' : i < step ? 'w-1.5 h-1.5 bg-blue-300' : 'w-1.5 h-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => go('bwd')}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
          >
            <ArrowLeft size={14} /> Anterior
          </button>

          <div className="flex items-center gap-2">
            {cur.action && (
              <button
                onClick={() => handleAction(cur.action!.route)}
                className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
              >
                {cur.action.label}
              </button>
            )}
            <button
              onClick={() => go('fwd')}
              className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${
                isLast
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLast ? (
                <><CheckCircle2 size={14} /> Concluir</>
              ) : (
                <>Próximo <ArrowRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Restart button ────────────────────────────────────────────────────────────
export function RestartTourButton() {
  function restart() {
    localStorage.removeItem(TOUR_KEY)
    window.location.reload()
  }
  return (
    <button
      onClick={restart}
      className="text-xs text-gray-400 hover:text-blue-600 hover:underline transition-colors"
    >
      Ver tour novamente
    </button>
  )
}
