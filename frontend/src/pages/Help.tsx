import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, FolderPlus, Table2, GitBranch, Building2,
  BarChart3, Trophy, ChevronRight, ChevronLeft, CheckCircle2,
  Upload, Download, Plus, ArrowRight, Zap, Target, TrendingDown,
  TrendingUp, AlertCircle, Info, BookOpen, Layers,
  PieChart, Clock, Handshake,
} from 'lucide-react'

// ── Animations ───────────────────────────────────────────────────────────────
const ANIM = `
  @keyframes slideIn  { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes heroSlide{ from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
  .slide-in  { animation: slideIn   .45s cubic-bezier(.22,1,.36,1) both }
  .fade-up   { animation: fadeUp    .4s  cubic-bezier(.22,1,.36,1) both }
  .hero-slide{ animation: heroSlide .45s cubic-bezier(.22,1,.36,1) both }
  .d1{animation-delay:.05s}.d2{animation-delay:.1s}.d3{animation-delay:.15s}
  .d4{animation-delay:.2s} .d5{animation-delay:.25s}.d6{animation-delay:.3s}
  .d7{animation-delay:.35s}.d8{animation-delay:.4s}
`

// ── Micro-components ─────────────────────────────────────────────────────────
function Lbl({ c, children }: { c?: string; children: React.ReactNode }) {
  return <p className={`text-[9px] font-black uppercase tracking-[.12em] mb-2 ${c ?? 'text-gray-400'}`}>{children}</p>
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-3 ${className}`}>{children}</div>
}
function Step({ n, title, sub, color = 'bg-gray-900' }: { n: number | string; title: string; sub?: string; color?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-5 h-5 rounded-full ${color} text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>{n}</div>
      <div>
        <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{sub}</p>}
      </div>
    </div>
  )
}
function Callout({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warn' | 'ok' | 'tip' }) {
  const s = {
    info: { bg: 'bg-blue-50 border-blue-200',   icon: Info,         ic: 'text-blue-500',  tx: 'text-blue-800' },
    warn: { bg: 'bg-amber-50 border-amber-200',  icon: AlertCircle,  ic: 'text-amber-500', tx: 'text-amber-800' },
    ok:   { bg: 'bg-green-50 border-green-200',  icon: CheckCircle2, ic: 'text-green-600', tx: 'text-green-800' },
    tip:  { bg: 'bg-purple-50 border-purple-200',icon: Zap,          ic: 'text-purple-500',tx: 'text-purple-800' },
  }[type]
  return (
    <div className={`flex gap-2 p-2.5 rounded-xl border ${s.bg}`}>
      <s.icon size={12} className={`flex-shrink-0 mt-0.5 ${s.ic}`} />
      <p className={`text-[11px] leading-relaxed ${s.tx}`}>{children}</p>
    </div>
  )
}

// ── ABC Bar visual ────────────────────────────────────────────────────────────
function AbcBar({ pct, cls }: { pct: number; cls: 'A' | 'B' | 'C' }) {
  const colors = { A: 'bg-blue-600', B: 'bg-indigo-400', C: 'bg-gray-300' }
  const text   = { A: 'text-blue-700 bg-blue-50 border-blue-200', B: 'text-indigo-600 bg-indigo-50 border-indigo-200', C: 'text-gray-500 bg-gray-50 border-gray-200' }
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={`font-black w-4 text-center`} style={{ color: cls === 'A' ? '#1d4ed8' : cls === 'B' ? '#4338ca' : '#9ca3af' }}>{cls}</span>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[cls]} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-bold px-1.5 py-0.5 rounded border text-[10px] ${text[cls]}`}>{pct}%</span>
    </div>
  )
}

// ── Mini chart bar ────────────────────────────────────────────────────────────
function MiniBar({ label, pct, value, color }: { label: string; pct: number; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-gray-500 w-20 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-600 font-semibold w-16 text-right shrink-0">{value}</span>
    </div>
  )
}

// ── Flow arrow ────────────────────────────────────────────────────────────────
function FlowItem({ icon: Icon, label, color, sub }: { icon: React.ElementType; label: string; color: string; sub?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-xl border ${color} bg-white text-center min-w-[70px]`}>
      <Icon size={14} className="text-gray-600" />
      <p className="text-[10px] font-bold text-gray-800 leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Pages ─────────────────────────────────────────────────────────────────────
interface Page { icon: React.ElementType; title: string; sub: string; accent: string; grad: string; bullets: string[]; right: React.ReactNode }

const PAGES: Page[] = [

  // ────────────────────────────────────────────────────────────────────────────
  // Capítulo 1 — O Sistema
  // ────────────────────────────────────────────────────────────────────────────
  {
    icon: LayoutDashboard, title: 'O Sistema', sub: 'Por que existe e o que resolve',
    accent: '#3b82f6', grad: 'from-blue-600 via-blue-700 to-indigo-800',
    bullets: ['O problema que resolve', 'Os 6 módulos', 'Como ler o Dashboard'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Antes / Depois */}
        <div className="flex flex-col gap-2.5">
          <Lbl>O problema resolvido</Lbl>
          <Card>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1.5">Sem o sistema</p>
            {['Excel por e-mail, sem versão','Comparação manual planilha a planilha','Sem histórico de revisões','Erros invisíveis de escopo'].map(t => (
              <div key={t} className="flex items-start gap-1.5 py-1 text-[11px] text-red-700 border-b border-red-50 last:border-0">
                <span className="font-black text-red-400 mt-0.5 text-[10px]">✕</span>{t}
              </div>
            ))}
          </Card>
          <Card>
            <p className="text-[9px] font-black uppercase tracking-widest text-green-500 mb-1.5">Com o sistema</p>
            {['Tudo centralizado na nuvem','Equalização automática item a item','Revisões versionadas e imutáveis','Rastreabilidade de ponta a ponta'].map(t => (
              <div key={t} className="flex items-start gap-1.5 py-1 text-[11px] text-green-700 border-b border-green-50 last:border-0">
                <CheckCircle2 size={11} className="text-green-500 shrink-0 mt-0.5" />{t}
              </div>
            ))}
          </Card>
        </div>

        {/* 6 módulos */}
        <div className="flex flex-col gap-2.5">
          <Lbl>6 módulos do sistema</Lbl>
          <div className="flex flex-col gap-1.5">
            {[
              { icon: FolderPlus, label: 'Projetos', desc: 'Cria e organiza cada processo', bg: 'bg-blue-50 text-blue-600' },
              { icon: Table2,     label: 'Planilha PQ', desc: 'Quantitativos + referência', bg: 'bg-cyan-50 text-cyan-600' },
              { icon: GitBranch,  label: 'Revisões',  desc: 'Snapshots imutáveis do PQ', bg: 'bg-violet-50 text-violet-600' },
              { icon: Building2,  label: 'Propostas', desc: 'Um por fornecedor / empresa', bg: 'bg-amber-50 text-amber-600' },
              { icon: BarChart3,  label: 'Análises',  desc: 'Pareto, ABC, disciplinas', bg: 'bg-emerald-50 text-emerald-600' },
              { icon: Trophy,     label: 'Baseline',  desc: 'Histórico de premiações', bg: 'bg-yellow-50 text-yellow-600' },
            ].map(({ icon: Icon, label, desc, bg }) => (
              <div key={label} className="flex items-center gap-2.5 p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${bg}`}><Icon size={14} /></div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{label}</p>
                  <p className="text-[10px] text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard */}
        <div className="flex flex-col gap-2.5">
          <Lbl>O que o Dashboard mostra</Lbl>
          <Card>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {[
                { icon: Target,      label: 'Saving Orçamento', desc: 'Premiado vs. Ref. PQ', c: 'bg-green-50 text-green-600' },
                { icon: Handshake,   label: 'Saving Negoc.', desc: 'Rev.0 → revisão final', c: 'bg-blue-50 text-blue-600' },
                { icon: Clock,       label: 'SLA do Processo', desc: 'Dias até a premiação', c: 'bg-amber-50 text-amber-600' },
                { icon: TrendingUp,  label: 'Volume Eq.', desc: 'Total contratos', c: 'bg-indigo-50 text-indigo-600' },
              ].map(({ icon: Icon, label, desc, c }) => (
                <div key={label} className={`flex gap-2 p-2 rounded-xl border border-gray-100`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${c}`}><Icon size={12} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-800 leading-tight">{label}</p>
                    <p className="text-[9px] text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Callout type="info">Os valores do Dashboard são calculados a partir do <strong>Baseline</strong>. Sem premiação registrada, gráficos ficam vazios.</Callout>
          </Card>
          <Card>
            <Lbl>SPE — Unidade Contratante</Lbl>
            <p className="text-[11px] text-gray-500 leading-relaxed">Cada projeto é associado a uma empresa do grupo (SPE). O Dashboard mostra o volume contratado consolidado por SPE, facilitando a gestão do portfólio de todo o grupo.</p>
          </Card>
          <Callout type="ok">Fluxo ideal: <strong>Projeto → PQ → Revisão → Propostas → Análise → Premiação → Baseline</strong></Callout>
        </div>
      </div>
    ),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Capítulo 2 — Curva ABC & Pareto
  // ────────────────────────────────────────────────────────────────────────────
  {
    icon: PieChart, title: 'Curva ABC & Pareto', sub: 'Onde está o dinheiro — e onde focar',
    accent: '#10b981', grad: 'from-emerald-600 via-green-700 to-teal-800',
    bullets: ['O que é a Curva ABC', 'Como ler o Pareto', 'Estratégia de negociação'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* O que é ABC */}
        <div className="flex flex-col gap-2.5">
          <Lbl>O que é a Curva ABC</Lbl>
          <Card>
            <p className="text-[11px] text-gray-600 leading-relaxed mb-3">
              Classifica itens do PQ pelo <strong>percentual acumulado do valor total</strong>, revelando onde está o dinheiro.
            </p>
            <div className="flex flex-col gap-2 mb-3">
              <AbcBar pct={70} cls="A" />
              <AbcBar pct={20} cls="B" />
              <AbcBar pct={10} cls="C" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wide">Classe A — Críticos</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Representam 70% do valor total. Geralmente apenas 10–20% dos itens. São os que definem o jogo.</p>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wide">Classe B — Importantes</p>
                <p className="text-[11px] text-indigo-600 mt-0.5">Os próximos 20% do valor. Merecem atenção, mas com menor urgência.</p>
              </div>
              <div className="p-2 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Classe C — Residuais</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Os últimos 10% do valor. Muitos itens, baixo impacto financeiro.</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabela Pareto visual */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Exemplo real de Pareto</Lbl>
          <Card className="p-0 overflow-hidden">
            <div className="bg-gray-800 text-white px-3 py-2 text-[9px] font-black uppercase tracking-widest flex items-center justify-between">
              <span>Tabela Pareto — Referência PQ</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-full">8 itens</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <th className="px-2 py-1.5 text-left font-semibold">Descrição</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Valor</th>
                  <th className="px-2 py-1.5 text-center font-semibold">%Acum</th>
                  <th className="px-2 py-1.5 text-center font-semibold">Cls</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { d: 'CBUQ Camada de rolamento', v: 'R$ 4,2M', p: '42%', c: 'A', bg: 'bg-blue-50' },
                  { d: 'Base de brita graduada', v: 'R$ 2,1M', p: '63%', c: 'A', bg: 'bg-blue-50' },
                  { d: 'Sub-base compactada', v: 'R$ 0,7M', p: '70%', c: 'A', bg: 'bg-blue-50' },
                  { d: 'Escavação mecânica', v: 'R$ 0,6M', p: '76%', c: 'B', bg: 'bg-indigo-50' },
                  { d: 'Galerias de concreto', v: 'R$ 0,5M', p: '81%', c: 'B', bg: 'bg-indigo-50' },
                  { d: 'Sinalização horizontal', v: 'R$ 0,4M', p: '85%', c: 'B', bg: 'bg-indigo-50' },
                  { d: 'Canteiro de obras', v: 'R$ 0,3M', p: '88%', c: 'B', bg: 'bg-indigo-50' },
                  { d: 'Demais itens (n=45)', v: 'R$ 1,2M', p: '100%', c: 'C', bg: '' },
                ].map(({ d, v, p, c, bg }) => (
                  <tr key={d} className={`border-b border-gray-50 ${bg}`}>
                    <td className="px-2 py-1.5 text-gray-700 leading-tight">{d}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{v}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{p}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`font-black text-[10px] px-1.5 py-0.5 rounded-full ${c === 'A' ? 'bg-blue-600 text-white' : c === 'B' ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}>{c}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Uso prático */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Como usar na prática</Lbl>
          <Card>
            <div className="flex flex-col gap-2.5">
              <Step n={1} title="Abra a aba Análises" sub="Menu → Análises do projeto atual" color="bg-emerald-600" />
              <Step n={2} title="Selecione a fonte" sub="'Referência PQ' para análise de custo, ou 'Propostas' para análise de preços" color="bg-emerald-600" />
              <Step n={3} title="Leia os badges A/B/C" sub="O total por classe aparece no cabeçalho" color="bg-emerald-600" />
              <Step n={4} title="Exporte para Excel" sub="Relatório completo com Pareto, disciplinas e categorias" color="bg-emerald-600" />
            </div>
          </Card>
          <Callout type="tip">
            <strong>Estratégia Pareto:</strong> Concentre a negociação nos itens Classe A. 3–4 itens geralmente respondem por mais de 70% do valor — uma redução de 5% neles vale mais que zerar todos os itens C.
          </Callout>
          <Card>
            <Lbl>Quando usar "Fonte: Propostas"</Lbl>
            <p className="text-[11px] text-gray-500 leading-relaxed">Quando você quer saber quais itens os fornecedores precificaram mais alto em relação uns aos outros — ideal para identificar cherry picking.</p>
          </Card>
        </div>
      </div>
    ),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Capítulo 3 — Disciplinas, Categorias & Localidades
  // ────────────────────────────────────────────────────────────────────────────
  {
    icon: Layers, title: 'Disciplinas & Composição', sub: 'Entenda como o escopo se distribui',
    accent: '#8b5cf6', grad: 'from-violet-600 via-purple-700 to-fuchsia-800',
    bullets: ['Análise por disciplina', 'Análise por categoria', 'Análise por localidade'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Disciplinas */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Análise por Disciplina</Lbl>
          <Card>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Mostra como o valor se distribui entre as áreas técnicas da obra. Identifique qual disciplina concentra mais custo.</p>
            <div className="flex flex-col gap-2">
              <MiniBar label="Civil"       pct={58} value="R$ 5,8M" color="bg-blue-500" />
              <MiniBar label="Pavimentação" pct={22} value="R$ 2,2M" color="bg-violet-400" />
              <MiniBar label="Drenagem"    pct={12} value="R$ 1,2M" color="bg-cyan-400" />
              <MiniBar label="Sinalização" pct={5}  value="R$ 0,5M" color="bg-amber-400" />
              <MiniBar label="Ambiental"   pct={3}  value="R$ 0,3M" color="bg-emerald-400" />
            </div>
          </Card>
          <Callout type="info">Disciplinas são preenchidas no campo <strong>Disciplina</strong> de cada item da Planilha PQ. Use nomes consistentes para análises corretas.</Callout>
        </div>

        {/* Categorias */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Análise por Categoria</Lbl>
          <Card>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Segmenta o escopo por tipo de serviço — permite cruzar com disciplinas para entender a composição do custo.</p>
            <div className="flex flex-col gap-2">
              <MiniBar label="Pavimentação"   pct={42} value="R$ 4,2M" color="bg-indigo-500" />
              <MiniBar label="Terraplenagem"  pct={28} value="R$ 2,8M" color="bg-purple-400" />
              <MiniBar label="Drenagem"       pct={15} value="R$ 1,5M" color="bg-fuchsia-400" />
              <MiniBar label="OAE"            pct={10} value="R$ 1,0M" color="bg-pink-400" />
              <MiniBar label="Sinalização"    pct={5}  value="R$ 0,5M" color="bg-rose-300" />
            </div>
          </Card>
          <Card>
            <Lbl>Categorias disponíveis</Lbl>
            <div className="flex flex-wrap gap-1 mt-1">
              {['Terraplenagem','Pavimentação','Drenagem','OAE','OAC','Sinalização','Edificações','Meio Ambiente'].map(c => (
                <span key={c} className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">{c}</span>
              ))}
            </div>
          </Card>
        </div>

        {/* Localidades */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Análise por Localidade</Lbl>
          <Card>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Para projetos extensos como rodovias, o campo <strong>Localidade</strong> no PQ permite comparar custo entre trechos ou lotes.</p>
            <div className="flex flex-col gap-2">
              <MiniBar label="KM 45–80"   pct={45} value="R$ 4,5M" color="bg-teal-500" />
              <MiniBar label="KM 80–120"  pct={33} value="R$ 3,3M" color="bg-emerald-400" />
              <MiniBar label="KM 120–145" pct={22} value="R$ 2,2M" color="bg-green-300" />
            </div>
          </Card>
          <Card>
            <Lbl>Como preencher localidade</Lbl>
            <div className="flex flex-col gap-2 mt-1">
              <Step n="→" title="Na PQ, coluna Localidade" sub="Ex: 'KM 45–80', 'Lote A', 'Ponte Rio Verde'" color="bg-violet-600" />
              <Step n="→" title="Análises → aba Localidades" sub="Gráfico e tabela por trecho são gerados automaticamente" color="bg-violet-600" />
            </div>
          </Card>
          <Callout type="tip">
            Deixe o campo Localidade em branco para itens que abrangem toda a obra (mobilização, administração local, etc.).
          </Callout>
        </div>
      </div>
    ),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Capítulo 4 — Revisões & Baseline
  // ────────────────────────────────────────────────────────────────────────────
  {
    icon: GitBranch, title: 'Revisões & Baseline', sub: 'Rastreabilidade e histórico de premiações',
    accent: '#f59e0b', grad: 'from-amber-500 via-orange-600 to-orange-700',
    bullets: ['O que são revisões', 'Comparativo entre revisões', 'Baseline e KPIs do Dashboard'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Revisões */}
        <div className="flex flex-col gap-2.5">
          <Lbl>O que são revisões</Lbl>
          <Card>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">Revisões são <strong>fotocópias imutáveis</strong> do PQ em um momento no tempo. Uma vez criada, nenhuma alteração posterior afeta a revisão.</p>
            <div className="flex items-center gap-1 mb-3">
              {[{ l: 'Rev 0', c: 'bg-blue-600', sub: 'Edital' }, { l: 'Rev 1', c: 'bg-violet-600', sub: 'Addendum' }, { l: 'Rev 2', c: 'bg-indigo-600', sub: 'Final' }].map((r, i, a) => (
                <React.Fragment key={r.l}>
                  <div className="flex flex-col items-center">
                    <span className={`${r.c} text-white text-[10px] font-black px-2 py-1 rounded-md`}>{r.l}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">{r.sub}</span>
                  </div>
                  {i < a.length - 1 && <ArrowRight size={12} className="text-gray-300 shrink-0 mb-3" />}
                </React.Fragment>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Step n={1} title="Equalizações → + Nova Revisão" sub="O número é sugerido automaticamente" color="bg-amber-500" />
              <Step n={2} title="Adicione uma descrição" sub="Ex: Addendum 01 — itens de drenagem" color="bg-amber-500" />
              <Step n={3} title="Continue editando o PQ" sub="A revisão criada permanece intacta" color="bg-amber-500" />
            </div>
          </Card>
          <Callout type="warn">Crie uma revisão <strong>antes</strong> de alterar itens no PQ. Sem revisão, o histórico não é preservado.</Callout>
        </div>

        {/* Comparativo de revisões */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Comparativo Rev A × Rev B</Lbl>
          <Card className="p-0 overflow-hidden">
            <div className="bg-gray-800 text-white px-3 py-2 text-[9px] font-black uppercase tracking-widest">
              Análises → Aba Revisões
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <th className="px-2 py-1.5 text-left">Item</th>
                  <th className="px-2 py-1.5 text-center">Status</th>
                  <th className="px-2 py-1.5 text-right">Δ Qtd</th>
                  <th className="px-2 py-1.5 text-right">Δ Valor</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { item: 'PAV-003', st: 'Adicionado', stc: 'bg-green-100 text-green-700', dq: '+500 m²', dv: '+R$ 42.500', dc: 'text-green-600' },
                  { item: 'DRE-007', st: 'Removido',   stc: 'bg-red-100 text-red-700',    dq: '—',       dv: '-R$ 18.000', dc: 'text-red-500' },
                  { item: 'TER-002', st: 'Alterado',   stc: 'bg-amber-100 text-amber-700', dq: '+200 m³', dv: '+R$ 9.000',  dc: 'text-amber-600' },
                  { item: 'SIN-001', st: 'Inalterado', stc: 'bg-gray-100 text-gray-500',  dq: '—',       dv: '—',          dc: 'text-gray-400' },
                ].map(({ item, st, stc, dq, dv, dc }) => (
                  <tr key={item} className="border-b border-gray-50">
                    <td className="px-2 py-1.5 font-mono text-gray-700 font-semibold">{item}</td>
                    <td className="px-2 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded font-bold ${stc}`}>{st}</span></td>
                    <td className={`px-2 py-1.5 text-right font-semibold ${dc}`}>{dq}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${dc}`}>{dv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Callout type="info">O comparativo também mostra <strong>Validação de Escopo</strong> — identifica se fornecedores receberam e precificaram uma revisão diferente da atual.</Callout>
        </div>

        {/* Baseline */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Baseline — registrando premiações</Lbl>
          <Card>
            <div className="flex flex-col gap-2.5">
              <Step n={1} title="Menu → Baseline" sub="Todos os projetos e propostas aparecem listados" color="bg-orange-500" />
              <Step n={2} title="Marque a proposta vencedora" sub="Clique em 'Premiar' na linha da empresa" color="bg-orange-500" />
              <Step n={3} title="Informe data e dados" sub="Data de premiação, valor final do contrato" color="bg-orange-500" />
              <Step n={4} title="Dashboard atualizado" sub="KPIs, gráficos e tabela refletem na hora" color="bg-orange-500" />
            </div>
          </Card>
          <Card>
            <Lbl>O que o Baseline alimenta</Lbl>
            <div className="flex flex-col gap-1.5 mt-1">
              {[
                { icon: TrendingDown, label: 'Saving Orçamento', c: 'bg-green-50 text-green-600' },
                { icon: Handshake,    label: 'Saving Negociação', c: 'bg-blue-50 text-blue-600' },
                { icon: Clock,        label: 'SLA do Processo',   c: 'bg-amber-50 text-amber-600' },
                { icon: BarChart3,    label: 'Volume por SPE',    c: 'bg-purple-50 text-purple-600' },
              ].map(({ icon: Icon, label, c }) => (
                <div key={label} className={`flex items-center gap-2 p-1.5 rounded-lg border border-gray-100`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${c}`}><Icon size={11} /></div>
                  <p className="text-[11px] font-semibold text-gray-700">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    ),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Capítulo 5 — Projetos & Planilha PQ
  // ────────────────────────────────────────────────────────────────────────────
  {
    icon: FolderPlus, title: 'Projetos & Planilha PQ', sub: 'Como criar do zero — passo a passo',
    accent: '#06b6d4', grad: 'from-cyan-600 via-sky-700 to-blue-800',
    bullets: ['Criar um projeto com SPE', 'Estrutura das 12 colunas PQ', 'Importar via Excel'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Criar projeto */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Criando um projeto</Lbl>
          <Card>
            <div className="flex flex-col gap-2.5 mb-3">
              <Step n={1} title="Menu → Projetos" sub="Ícone de pasta no menu lateral esquerdo" color="bg-cyan-600" />
              <Step n={2} title="Clique em + Novo Projeto" sub="Botão azul no canto superior direito" color="bg-cyan-600" />
              <Step n={3} title="Preencha o formulário" color="bg-cyan-600" />
            </div>
            {/* Mini form */}
            <div className="rounded-xl border border-gray-200 overflow-hidden text-[10px]">
              <div className="bg-gray-800 text-white px-2.5 py-1.5 font-bold">Novo Projeto</div>
              <div className="p-2.5 flex flex-col gap-1.5">
                {[
                  { l: 'Nome *', v: 'Recuperação Lote KM 45–120' },
                  { l: 'SPE *', v: 'Litoral Pioneiro ▾' },
                  { l: 'Tipo de Obra *', v: 'Duplicação ▾' },
                  { l: 'Nº Termo de Ref.', v: 'TR-2024/082' },
                  { l: 'Extensão (km)', v: '75.320' },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className="text-gray-400 w-24 shrink-0">{l}</span>
                    <span className="flex-1 border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 bg-white">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Callout type="warn">Excluir um projeto remove <strong>todos os dados vinculados</strong> (PQ, propostas, revisões) permanentemente.</Callout>
        </div>

        {/* Estrutura PQ */}
        <div className="flex flex-col gap-2.5">
          <Lbl>As 12 colunas da Planilha PQ</Lbl>
          <Card className="p-0 overflow-hidden">
            <div className="bg-blue-700 text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest">Planilha de Quantitativos</div>
            <table className="w-full text-[10px]">
              <tbody className="divide-y divide-gray-50">
                {[
                  { c: '1', n: 'Item',           ex: '1.1', req: true },
                  { c: '2', n: 'Localidade',     ex: 'KM 45–80', req: false },
                  { c: '3', n: 'Disciplina',     ex: 'Civil', req: false },
                  { c: '4', n: 'Categoria',      ex: 'Pavimentação', req: false },
                  { c: '5', n: 'Código',         ex: 'PAV-003', req: false },
                  { c: '6', n: 'Descrição *',    ex: 'CBUQ Camada de rolamento', req: true },
                  { c: '7', n: 'Unidade *',      ex: 'm²', req: true },
                  { c: '8', n: 'Quantidade *',   ex: '50.000', req: true },
                  { c: '9', n: 'Referência',     ex: 'SICRO', req: false },
                  { c:'10', n: 'Preço Unit. RF', ex: 'R$ 85,00', req: false },
                  { c:'11', n: 'Preço Total RF', ex: 'R$ 4,25M', req: false },
                  { c:'12', n: 'Observação',     ex: 'Inclui compactação', req: false },
                ].map(({ c, n, ex, req }) => (
                  <tr key={c} className={req ? 'bg-cyan-50/50' : ''}>
                    <td className="px-2 py-1 text-gray-400 w-5">{c}</td>
                    <td className="px-2 py-1 font-semibold text-gray-700">{n}</td>
                    <td className="px-2 py-1 text-gray-400 font-mono text-[9px]">{ex}</td>
                    <td className="px-2 py-1 text-center">{req ? <span className="text-cyan-600 font-black text-[10px]">✓</span> : <span className="text-gray-200">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-1.5 bg-cyan-50 border-t border-cyan-100 text-[10px] text-cyan-700 flex items-center gap-1">
              <span className="font-black">✓</span> obrigatório · colunas 2–5 alimentam as Análises
            </div>
          </Card>
        </div>

        {/* Inserir dados */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Como inserir dados no PQ</Lbl>
          <Card className="border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center"><Upload size={12} className="text-green-600" /></div>
                <p className="text-xs font-bold text-gray-800">Via Excel — Recomendado</p>
              </div>
              <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-black">Mais rápido</span>
            </div>
            <div className="flex flex-col gap-2">
              <Step n={1} title="Baixar Template Excel" sub="Botão 'Template' no topo da tela PQ" color="bg-green-600" />
              <Step n={2} title="Preencher o arquivo" sub="Uma linha por item, siga os cabeçalhos exatos" color="bg-green-600" />
              <Step n={3} title="Importar" sub="Botão 'Importar' → selecione o arquivo preenchido" color="bg-green-600" />
              <Step n={4} title="Revise e Salve" sub="Edite qualquer item diretamente na tabela" color="bg-green-600" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center"><Plus size={12} className="text-blue-600" /></div>
              <p className="text-xs font-bold text-gray-800">Inserção manual</p>
            </div>
            <p className="text-[11px] text-gray-500">Clique em <strong>+ Adicionar Item</strong> e edite as células diretamente na tabela. Bom para pequenas adições.</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center"><Download size={12} className="text-amber-600" /></div>
              <p className="text-xs font-bold text-gray-800">Exportar Excel</p>
            </div>
            <p className="text-[11px] text-gray-500">Baixe o PQ atual para compartilhar com fornecedores ou auditar.</p>
          </Card>
        </div>
      </div>
    ),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Capítulo 6 — Propostas & Equalização + Fluxo Completo
  // ────────────────────────────────────────────────────────────────────────────
  {
    icon: Building2, title: 'Propostas & Equalização', sub: 'Cadastrar fornecedores e decidir',
    accent: '#f43f5e', grad: 'from-rose-600 via-pink-700 to-red-800',
    bullets: ['Criar uma proposta + Excel', 'Ler a tabela de equalização', 'Fluxo completo + checklist'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Criar proposta */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Criando uma proposta</Lbl>
          <Card>
            <div className="flex flex-col gap-2.5 mb-3">
              <Step n={1} title="Menu → Equalização do projeto" color="bg-rose-600" />
              <Step n={2} title="Escolha a revisão" sub="Seletor no topo — a proposta fica vinculada à revisão" color="bg-rose-600" />
              <Step n={3} title="+ Nova Proposta" sub="Informe empresa, CNPJ, BDI global e data" color="bg-rose-600" />
              <Step n={4} title="Template Excel" sub="Baixe o modelo pré-preenchido com os itens do PQ" color="bg-rose-600" />
              <Step n={5} title="Fornecedor preenche" sub="Coluna 'Preço Unitário' e dados com e sem REIDI" color="bg-rose-600" />
              <Step n={6} title="Importar de volta" sub="Preços carregados automaticamente" color="bg-rose-600" />
            </div>
            <Callout type="warn">Cada revisão do PQ exige novas propostas. Não reutilize propostas de uma revisão em outra — o escopo pode ter mudado.</Callout>
          </Card>
        </div>

        {/* Tabela de equalização */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Tabela de Equalização</Lbl>
          <Card className="p-0 overflow-hidden">
            <div className="bg-gray-800 text-white px-3 py-2 text-[9px] font-black uppercase tracking-widest flex items-center justify-between">
              <span>Equalização — Rev 2</span>
              <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">3 propostas</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <th className="px-2 py-1.5 text-left">Item</th>
                  <th className="px-2 py-1.5 text-right">Ref. PQ</th>
                  <th className="px-2 py-1.5 text-right text-green-700 bg-green-50">Empresa A</th>
                  <th className="px-2 py-1.5 text-right">Empresa B</th>
                  <th className="px-2 py-1.5 text-right">Empresa C</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { i: 'PAV-001', r: '4.250K', a: '3.910K', b: '4.580K', c: '4.120K', best: 'a' },
                  { i: 'DRE-003', r: '1.200K', a: '1.380K', b: '1.090K', c: '1.250K', best: 'b' },
                  { i: 'TER-002', r: '850K',   a: '820K',   b: '870K',   c: '790K',   best: 'c' },
                  { i: 'SIN-001', r: '320K',   a: '295K',   b: '340K',   c: '310K',   best: 'a' },
                ].map(({ i, r, a, b, c, best }) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-2 py-1.5 font-mono font-semibold text-gray-700">{i}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">{r}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${best === 'a' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>{a}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${best === 'b' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>{b}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${best === 'c' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>{c}</td>
                  </tr>
                ))}
                <tr className="bg-gray-800 text-white">
                  <td className="px-2 py-2 font-black text-[11px]">TOTAL</td>
                  <td className="px-2 py-2 text-right text-gray-400 text-[11px]">6.620K</td>
                  <td className="px-2 py-2 text-right font-black text-green-400 bg-green-900/30 text-[11px]">6.405K ★</td>
                  <td className="px-2 py-2 text-right text-gray-400 text-[11px]">6.880K</td>
                  <td className="px-2 py-2 text-right text-gray-400 text-[11px]">6.470K</td>
                </tr>
              </tbody>
            </table>
            <div className="px-3 py-1.5 bg-green-50 text-[10px] text-green-700 flex items-center gap-1.5 border-t border-green-100">
              <span className="w-3 h-3 bg-green-100 border border-green-300 rounded inline-block" /> Menor preço por item destacado em verde
            </div>
          </Card>
          <Callout type="tip">Observe que o vencedor global (Empresa A) não tem o menor preço em todos os itens. Analise o cherry picking antes de decidir.</Callout>
        </div>

        {/* Fluxo completo + Checklist */}
        <div className="flex flex-col gap-2.5">
          <Lbl>Fluxo completo de trabalho</Lbl>
          <Card>
            {[
              { n: 1, l: 'Criar Projeto', s: 'Nome, SPE, tipo de obra', c: 'bg-blue-600' },
              { n: 2, l: 'Montar PQ',     s: 'Importar Excel ou inserir', c: 'bg-cyan-600' },
              { n: 3, l: 'Criar Rev 0',   s: 'Snapshot inicial do edital', c: 'bg-violet-600' },
              { n: 4, l: 'Propostas',     s: 'Uma por fornecedor', c: 'bg-amber-600' },
              { n: 5, l: 'Equalizar',     s: 'Comparar item a item', c: 'bg-orange-600' },
              { n: 6, l: 'Analisar',      s: 'ABC, disciplinas, revisões', c: 'bg-emerald-600' },
              { n: 7, l: 'Premiar',       s: 'Registrar no Baseline', c: 'bg-yellow-600' },
            ].map(({ n, l, s, c }) => (
              <div key={n} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                <div className={`w-5 h-5 rounded-full ${c} text-white text-[10px] font-black flex items-center justify-center shrink-0`}>{n}</div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-800 leading-tight">{l}</p>
                  <p className="text-[10px] text-gray-400">{s}</p>
                </div>
              </div>
            ))}
          </Card>
          <Card className="border border-green-100">
            <Lbl c="text-green-600">Checklist — antes de premiar</Lbl>
            <div className="flex flex-col gap-1 mt-1">
              {['PQ 100% preenchido com disciplinas','Revisão criada antes de mudanças','Todas as propostas importadas','Pareto executado — itens A negociados','Comparativo de revisões conferido'].map(i => (
                <div key={i} className="flex items-center gap-1.5 py-1 border-b border-gray-50 last:border-0">
                  <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                  <p className="text-[11px] text-gray-600">{i}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    ),
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Help() {
  const [active, setActive]       = useState(0)
  const [animKey, setAnimKey]     = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  const page  = PAGES[active]

  function goTo(idx: number) {
    if (idx === active || idx < 0 || idx >= PAGES.length) return
    setCompleted(p => new Set([...p, active]))
    setActive(idx)
    setAnimKey(k => k + 1)
  }
  function next() { goTo(active + 1) }
  function prev() { goTo(active - 1) }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const pct = Math.round(((active + 1) / PAGES.length) * 100)

  return (
    <>
      <style>{ANIM}</style>
      <div className="flex h-screen overflow-hidden bg-gray-50">

        {/* ── Hero panel ─────────────────────────────────────────────────────── */}
        <div
          key={`hero-${animKey}`}
          className={`w-64 flex-shrink-0 bg-gradient-to-b ${page.grad} flex flex-col overflow-hidden relative hero-slide`}
        >
          {/* Big decorative number */}
          <div
            className="absolute bottom-16 right-0 font-black text-white/[.04] select-none pointer-events-none leading-none"
            style={{ fontSize: 180 }}
          >
            {active + 1}
          </div>

          {/* Header */}
          <div className="px-5 py-4 flex items-center gap-2.5 border-b border-white/10 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-xs leading-tight">Guia do Sistema</p>
              <p className="text-white/50 text-[10px]">{PAGES.length} capítulos</p>
            </div>
          </div>

          {/* Chapter info */}
          <div className="flex-1 px-5 py-6 flex flex-col gap-5 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <page.icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white/50 text-[11px] font-semibold mb-1">Capítulo {active + 1} de {PAGES.length}</p>
              <h1 className="text-white font-black text-xl leading-tight">{page.title}</h1>
              <p className="text-white/60 text-xs mt-1.5 leading-relaxed">{page.sub}</p>
            </div>
            <div>
              <p className="text-white/40 text-[9px] font-black uppercase tracking-[.12em] mb-2">Neste capítulo</p>
              <ul className="space-y-2">
                {page.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-white/75 text-[11px] leading-relaxed">
                    <CheckCircle2 size={11} className="shrink-0 mt-0.5 text-white/40" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Progress dots + keyboard hint */}
          <div className="px-5 py-4 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              {PAGES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === active
                      ? 'w-6 h-2 bg-white'
                      : completed.has(i)
                      ? 'w-2 h-2 bg-white/60'
                      : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <p className="text-white/30 text-[10px] flex items-center gap-1">
              <kbd className="bg-white/10 px-1 py-0.5 rounded font-mono text-[9px]">←</kbd>
              <kbd className="bg-white/10 px-1 py-0.5 rounded font-mono text-[9px]">→</kbd>
              navegar
            </p>
          </div>
        </div>

        {/* ── Content area ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-36 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: page.accent }}
                />
              </div>
              <p className="text-xs text-gray-400 font-semibold">{pct}%</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                disabled={active === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
              >
                <ChevronLeft size={13} /> Anterior
              </button>

              {active < PAGES.length - 1 ? (
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90 shadow-sm"
                  style={{ background: page.accent }}
                >
                  {PAGES[active + 1].title} <ChevronRight size={13} />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg shadow-sm">
                  <CheckCircle2 size={13} /> Guia concluído!
                </div>
              )}
            </div>
          </div>

          {/* Page content */}
          <div key={animKey} className="flex-1 overflow-y-auto p-4 slide-in">
            {page.right}
          </div>
        </div>
      </div>
    </>
  )
}
