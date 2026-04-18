import React, { useState, useEffect } from 'react'
import {
  Play, LayoutDashboard, FolderPlus, Table2, GitBranch,
  Building2, BarChart3, Trophy, Lightbulb, ChevronRight, ChevronLeft,
  CheckCircle2, Upload, Download, Plus, ArrowRight, Star, Zap,
  Target, TrendingUp, FileSpreadsheet, Filter, Award, AlertCircle,
  Info, BookOpen, GitCommit, Layers,
} from 'lucide-react'

// ── Animation CSS ─────────────────────────────────────────────────────────────
const ANIM_CSS = `
  @keyframes heroIn {
    from { opacity:0; transform: translateY(28px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes panelIn {
    from { opacity:0; transform: translateX(32px); }
    to   { opacity:1; transform: translateX(0); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform: translateY(14px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity:0; transform: scale(0.93); }
    to   { opacity:1; transform: scale(1); }
  }
  @keyframes dotPulse {
    0%,100% { transform: scale(1); }
    50%      { transform: scale(1.25); }
  }
  .anim-hero  { animation: heroIn  0.55s cubic-bezier(.22,1,.36,1) both; }
  .anim-panel { animation: panelIn 0.55s cubic-bezier(.22,1,.36,1) both; }
  .anim-up    { animation: fadeUp  0.45s cubic-bezier(.22,1,.36,1) both; }
  .anim-scale { animation: scaleIn 0.4s  cubic-bezier(.22,1,.36,1) both; }
  .d1 { animation-delay:.05s } .d2 { animation-delay:.10s } .d3 { animation-delay:.15s }
  .d4 { animation-delay:.20s } .d5 { animation-delay:.25s } .d6 { animation-delay:.30s }
  .dot-active { animation: dotPulse .4s ease; }
  .step-line::before {
    content:''; position:absolute; left:11px; top:24px; bottom:-8px;
    width:1px; background: rgba(255,255,255,.15);
  }
`

// ── Chapter themes ─────────────────────────────────────────────────────────────
const THEMES = [
  { grad: 'from-blue-600 via-blue-700 to-indigo-800',   accent: '#3b82f6', light: 'bg-blue-50',   ring: 'ring-blue-200'  },
  { grad: 'from-slate-700 via-slate-800 to-gray-900',   accent: '#64748b', light: 'bg-slate-50',  ring: 'ring-slate-200' },
  { grad: 'from-indigo-600 via-indigo-700 to-purple-800',accent: '#6366f1', light: 'bg-indigo-50', ring: 'ring-indigo-200'},
  { grad: 'from-emerald-600 via-green-700 to-teal-800', accent: '#10b981', light: 'bg-emerald-50', ring: 'ring-emerald-200'},
  { grad: 'from-violet-600 via-purple-700 to-fuchsia-800',accent:'#8b5cf6',light:'bg-violet-50',  ring: 'ring-violet-200'},
  { grad: 'from-amber-500 via-orange-600 to-orange-700',accent: '#f59e0b', light: 'bg-amber-50',  ring: 'ring-amber-200' },
  { grad: 'from-teal-600 via-cyan-700 to-sky-800',      accent: '#14b8a6', light: 'bg-teal-50',   ring: 'ring-teal-200'  },
  { grad: 'from-rose-600 via-pink-700 to-red-800',      accent: '#f43f5e', light: 'bg-rose-50',   ring: 'ring-rose-200'  },
  { grad: 'from-yellow-500 via-amber-600 to-orange-600',accent: '#eab308', light: 'bg-yellow-50', ring: 'ring-yellow-200'},
  { grad: 'from-orange-600 via-red-600 to-rose-700',    accent: '#ea580c', light: 'bg-orange-50', ring: 'ring-orange-200'},
]

// ── Shared mini-components ─────────────────────────────────────────────────────
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-white/80 text-xs leading-relaxed">
      <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5 text-white/50" />
      <span>{children}</span>
    </li>
  )
}

function ContentCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${className}`}>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{children}</p>
}

function Row({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{n}</div>
      <div>
        <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Pill({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white ${color}`}>
      <Icon size={11} />{label}
    </span>
  )
}

function TipBox({ children, type = 'info' }: { children: React.ReactNode; type?: 'info'|'warn'|'ok' }) {
  const s = {
    info: { bg: 'bg-blue-50 border-blue-200',  ic: 'text-blue-500',  tx: 'text-blue-800',  I: Info },
    warn: { bg: 'bg-amber-50 border-amber-200', ic: 'text-amber-500', tx: 'text-amber-800', I: AlertCircle },
    ok:   { bg: 'bg-green-50 border-green-200', ic: 'text-green-500', tx: 'text-green-800', I: CheckCircle2 },
  }[type]
  return (
    <div className={`flex gap-2 p-3 rounded-xl border ${s.bg}`}>
      <s.I size={13} className={`flex-shrink-0 mt-0.5 ${s.ic}`} />
      <p className={`text-[11px] leading-relaxed ${s.tx}`}>{children}</p>
    </div>
  )
}

// ── Chapter definitions ────────────────────────────────────────────────────────
interface ChapterDef {
  icon: React.ElementType
  title: string
  sub: string
  bullets: string[]
  right: React.ReactNode
}

const CHAPTERS: ChapterDef[] = [
  // ── 1. Bem-vindo ─────────────────────────────────────────────────────────────
  {
    icon: Play, title: 'Bem-vindo', sub: 'O que é e para quem é',
    bullets: ['Entenda o propósito da plataforma', 'Conheça os 5 módulos principais', 'Saiba como o guia está estruturado'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="col-span-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl anim-up d1">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Sem o sistema</p>
              {['Excel descentralizado','Sem controle de revisões','Comparação manual e lenta','Zero rastreabilidade'].map(t => (
                <p key={t} className="flex items-center gap-1.5 text-xs text-red-700 py-0.5">
                  <span className="font-bold text-red-400">✕</span>{t}
                </p>
              ))}
            </div>
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl anim-up d2">
              <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-2">Com o sistema</p>
              {['Tudo centralizado','Revisões versionadas','Equalização automática','Histórico completo'].map(t => (
                <p key={t} className="flex items-center gap-1.5 text-xs text-green-700 py-0.5">
                  <CheckCircle2 size={11} className="text-green-500" />{t}
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <Label>5 módulos do sistema</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { icon: Table2,       label: 'Planilha PQ',    desc: 'Quantitativos, unidades e referência', c: 'text-blue-600 bg-blue-50' },
              { icon: GitBranch,    label: 'Revisões',       desc: 'Snapshots imutáveis do PQ',            c: 'text-indigo-600 bg-indigo-50' },
              { icon: Building2,    label: 'Equalização',    desc: 'Compare fornecedores item a item',     c: 'text-amber-600 bg-amber-50' },
              { icon: BarChart3,    label: 'Análises',       desc: 'Pareto, disciplinas e delta',          c: 'text-emerald-600 bg-emerald-50' },
              { icon: Trophy,       label: 'Baseline',       desc: 'Registro de premiações',               c: 'text-yellow-600 bg-yellow-50' },
            ].map(({ icon: Icon, label, desc, c }, i) => (
              <div key={label} className={`flex items-center gap-2.5 p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm anim-up d${i+2}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c}`}><Icon size={14} /></div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{label}</p>
                  <p className="text-[11px] text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── 2. Dashboard ─────────────────────────────────────────────────────────────
  {
    icon: LayoutDashboard, title: 'Dashboard', sub: 'Visão executiva do portfólio',
    bullets: ['KPIs consolidados do portfólio', 'Gráfico de evolução de valores', 'Acesso rápido a projetos recentes'],
    right: (
      <div className="flex flex-col gap-3 h-full content-start">
        <Label>O que você encontra</Label>
        <div className="grid grid-cols-2 gap-2 anim-up d1">
          {[
            { icon: Target,    title: 'KPIs do portfólio', desc: 'Projetos, valores e status em tempo real', c: 'text-blue-600 bg-blue-50' },
            { icon: TrendingUp,title: 'Gráfico temporal',  desc: 'Toggle semana / mês / ano',               c: 'text-indigo-600 bg-indigo-50' },
            { icon: BarChart3, title: 'Top projetos',      desc: 'Ranking por valor premiado',              c: 'text-green-600 bg-green-50' },
            { icon: FolderPlus,title: 'Recentes',          desc: 'Atalhos para PQ, Equalização e Análises', c: 'text-amber-600 bg-amber-50' },
          ].map(({ icon: Icon, title, desc, c }) => (
            <div key={title} className="flex gap-2 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c}`}><Icon size={14} /></div>
              <div>
                <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Label>Como usar</Label>
        <ContentCard className="anim-up d2">
          <div className="flex flex-col gap-2.5">
            <Row n={1} title="Acesse o Dashboard" sub="Primeira opção no menu lateral esquerdo." />
            <Row n={2} title="Alterne o período" sub="Botões Semana / Mês / Ano no gráfico de valores." />
            <Row n={3} title="Acesse um projeto" sub="Passe o mouse sobre o card para ver os atalhos." />
          </div>
        </ContentCard>
        <TipBox type="info">Os valores vêm do Baseline. Sem premiação registrada, os gráficos ficam em estado vazio.</TipBox>
      </div>
    ),
  },

  // ── 3. Projetos ───────────────────────────────────────────────────────────────
  {
    icon: FolderPlus, title: 'Projetos', sub: 'Criar e organizar licitações',
    bullets: ['Criar e configurar projetos', 'Entender os campos e status', 'Excluir projetos com segurança'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="flex flex-col gap-3">
          <Label>Criando um projeto</Label>
          <ContentCard>
            <div className="flex flex-col gap-2.5">
              <Row n={1} title="Acesse Projetos" sub="Menu lateral → ícone de pasta." />
              <Row n={2} title="Novo Projeto" sub="Botão azul no canto superior direito." />
              <Row n={3} title="Preencha os dados" sub="Nome, descrição, empresa, status." />
              <Row n={4} title="Salve e entre" sub="O menu Projeto Atual aparece na sidebar." />
            </div>
          </ContentCard>
          <TipBox type="warn">Excluir um projeto remove <strong>todos os dados vinculados</strong> permanentemente.</TipBox>
        </div>
        <div className="flex flex-col gap-3">
          <Label>Campos do projeto</Label>
          <ContentCard>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {[['Nome','Reforma Sede 2025','✓'],['Descrição','Obras civis','—'],['Empresa','Construtora ABC','—'],['Status','Em andamento','✓']].map(([c,e,r]) => (
                  <tr key={c}><td className="py-1.5 font-medium text-gray-700 w-1/3">{c}</td><td className="py-1.5 text-gray-400 text-[11px]">{e}</td><td className="py-1.5 text-center">{r==='✓'?<span className="text-green-500 font-bold">✓</span>:<span className="text-gray-200">—</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </ContentCard>
          <Label>Status disponíveis</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {[{ l:'Em Andamento',c:'bg-blue-50 text-blue-700 border-blue-100' },{ l:'Concluído',c:'bg-green-50 text-green-700 border-green-100' },{ l:'Cancelado',c:'bg-gray-100 text-gray-500 border-gray-100' }].map(s => (
              <div key={s.l} className={`px-3 py-2 rounded-xl border text-xs font-semibold text-center ${s.c}`}>{s.l}</div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── 4. Planilha PQ ────────────────────────────────────────────────────────────
  {
    icon: Table2, title: 'Planilha PQ', sub: 'Quantitativos do projeto',
    bullets: ['Estrutura de um item PQ', 'Inserir manualmente ou via Excel', 'Exportar para auditoria'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="flex flex-col gap-3">
          <Label>Campos de cada item</Label>
          <ContentCard>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {[['Código','EST-001','✓'],['Descrição','Escavação mecânica','✓'],['Unidade','m³','✓'],['Quantidade','1.500','✓'],['Preço Ref.','R$ 45,00','—'],['Disciplina','Terraplenagem','—'],['Categoria','Serviços','—']].map(([c,e,r]) => (
                  <tr key={c}><td className="py-1.5 font-medium text-gray-700 w-1/3 text-[11px]">{c}</td><td className="py-1.5 text-gray-400 font-mono text-[11px]">{e}</td><td className="py-1.5 text-center text-[11px]">{r==='✓'?<span className="text-green-500 font-bold">✓</span>:<span className="text-gray-200">—</span>}</td></tr>
                ))}
              </tbody>
            </table>
          </ContentCard>
          <TipBox type="info">Use Disciplina e Categoria consistentemente — alimentam os gráficos de Análises.</TipBox>
        </div>
        <div className="flex flex-col gap-3">
          <Label>Como inserir dados</Label>
          <div className="flex flex-col gap-2">
            {[
              { icon: Plus, title: 'Inserção manual', desc: '+ Adicionar Item na tabela. Ideal para ajustes pontuais.', c: 'bg-blue-100 text-blue-600', border: 'border-blue-100' },
              { icon: Upload, title: 'Importar Excel', desc: 'Baixe o Template, preencha e faça upload. Recomendado para grandes quantitativos.', c: 'bg-green-100 text-green-600', border: 'border-green-100', tag: true },
              { icon: Download, title: 'Exportar Excel', desc: 'Baixe o PQ atual em .xlsx para compartilhar ou auditar.', c: 'bg-amber-100 text-amber-600', border: 'border-amber-100' },
            ].map(({ icon: Icon, title, desc, c, border, tag }) => (
              <ContentCard key={title} className={`border ${border}`}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c}`}><Icon size={14} /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-gray-800">{title}</p>
                      {tag && <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold">Recomendado</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </ContentCard>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── 5. Revisões ──────────────────────────────────────────────────────────────
  {
    icon: GitBranch, title: 'Revisões', sub: 'Versionamento do PQ',
    bullets: ['Criar snapshots do PQ', 'Rastrear mudanças de escopo', 'Comparar duas revisões automaticamente'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="flex flex-col gap-3">
          <Label>O que são revisões</Label>
          <ContentCard>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">Snapshots <strong>imutáveis</strong> do PQ em um momento específico. Alterações futuras não afetam revisões já criadas.</p>
            <div className="flex items-center gap-1 mt-2">
              {[{l:'Rev 0',c:'bg-blue-600'},{l:'Rev 1',c:'bg-violet-600'},{l:'Rev 2',c:'bg-indigo-600'}].map((r,i,arr) => (
                <React.Fragment key={r.l}>
                  <div className={`${r.c} text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg`}>{r.l}</div>
                  {i < arr.length-1 && <ArrowRight size={12} className="text-gray-300" />}
                </React.Fragment>
              ))}
            </div>
          </ContentCard>
          <Label>Criando uma revisão</Label>
          <ContentCard>
            <div className="flex flex-col gap-2">
              <Row n={1} title="Acesse Equalização" sub="Menu lateral → Projeto Atual → Equalização." />
              <Row n={2} title="+ Nova Revisão" sub="O sistema sugere o próximo número." />
              <Row n={3} title="Defina a descrição" sub="Ex.: Addendum 01 — itens de drenagem." />
            </div>
          </ContentCard>
          <TipBox type="ok">Crie uma revisão <strong>antes</strong> de alterar o PQ para garantir rastreabilidade.</TipBox>
        </div>
        <div className="flex flex-col gap-3">
          <Label>Comparando em Análises</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { l:'Adicionados',  c:'bg-green-50 text-green-700 border-green-100' },
              { l:'Removidos',    c:'bg-red-50 text-red-700 border-red-100' },
              { l:'Alterados',    c:'bg-amber-50 text-amber-700 border-amber-100' },
              { l:'Sem alteração',c:'bg-gray-50 text-gray-500 border-gray-100' },
            ].map(b => (
              <div key={b.l} className={`p-2.5 rounded-xl border text-center text-xs font-semibold ${b.c}`}>{b.l}</div>
            ))}
          </div>
          <Label>Colunas nos itens alterados</Label>
          <ContentCard>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {[['Qtd A / Qtd B','Quantidade nas duas revisões'],['Δ Qtd','Variação numérica'],['Valor A / B','Total calculado'],['Δ Valor','Diferença em R$'],['Campos','Outros campos alterados']].map(([c,d]) => (
                  <tr key={c}><td className="py-1 font-mono text-[11px] text-gray-600 w-1/3">{c}</td><td className="py-1 text-gray-400 text-[11px]">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </ContentCard>
        </div>
      </div>
    ),
  },

  // ── 6. Propostas ─────────────────────────────────────────────────────────────
  {
    icon: FileSpreadsheet, title: 'Propostas', sub: 'Fornecedores e preços',
    bullets: ['Cadastrar uma nova proposta', 'Importar preços via Excel', 'Inserir preços manualmente'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="flex flex-col gap-3">
          <Label>Criando uma proposta</Label>
          <ContentCard>
            <div className="flex flex-col gap-2.5">
              <Row n={1} title="Equalização do projeto" sub="Menu lateral → Projeto Atual → Equalização." />
              <Row n={2} title="Escolha a revisão" sub="Propostas são vinculadas a uma revisão." />
              <Row n={3} title="+ Nova Proposta" sub="Dentro do painel da revisão correta." />
              <Row n={4} title="Preencha os dados" sub="Empresa, nº protocolo e data." />
            </div>
          </ContentCard>
          <TipBox type="warn">Nova revisão = novas propostas. As propostas da revisão antiga ficam vinculadas a ela.</TipBox>
        </div>
        <div className="flex flex-col gap-3">
          <Label>Inserindo preços</Label>
          <ContentCard className="border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-800">Template Excel</p>
              <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">Recomendado</span>
            </div>
            <ol className="text-[11px] text-gray-500 space-y-1 list-decimal list-inside">
              <li>Clique em <strong>Baixar Template</strong></li>
              <li>Arquivo já vem com os itens do PQ</li>
              <li>Preencha a coluna Preço Unitário</li>
              <li>Faça upload com <strong>Importar</strong></li>
            </ol>
          </ContentCard>
          <ContentCard>
            <p className="text-xs font-semibold text-gray-800 mb-1">Inserção manual</p>
            <p className="text-[11px] text-gray-500">Expanda a proposta e edite os preços na tabela. Use <kbd className="font-mono bg-gray-100 px-1 rounded text-[10px]">Tab</kbd> para navegar entre campos.</p>
          </ContentCard>
          <Label>Campos da proposta</Label>
          <ContentCard>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {[['Empresa','Nome do licitante'],['Nº/Protocolo','Referência da proposta'],['Data','Data de recebimento']].map(([c,d]) => (
                  <tr key={c}><td className="py-1 font-medium text-gray-700 text-[11px] w-1/3">{c}</td><td className="py-1 text-gray-400 text-[11px]">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </ContentCard>
        </div>
      </div>
    ),
  },

  // ── 7. Equalização ───────────────────────────────────────────────────────────
  {
    icon: Building2, title: 'Equalização', sub: 'Comparar propostas',
    bullets: ['Ler a tabela de equalização', 'Identificar o menor preço por item', 'Filtrar por disciplina e exportar'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="flex flex-col gap-3">
          <Label>Tabela de equalização</Label>
          <ContentCard>
            <div className="overflow-hidden rounded-lg border border-gray-200 text-xs">
              <table className="w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left text-[10px]">Item</th>
                    <th className="px-2 py-2 text-right text-[10px]">Ref.</th>
                    <th className="px-2 py-2 text-right text-green-300 text-[10px]">Forn. A</th>
                    <th className="px-2 py-2 text-right text-[10px]">Forn. B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-2 py-1.5 text-gray-700 text-[11px]">EST-001</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 text-[11px]">67.500</td>
                    <td className="px-2 py-1.5 text-right font-bold text-green-600 bg-green-50 text-[11px]">58.200</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 text-[11px]">72.000</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5 text-gray-700 text-[11px]">DRE-001</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 text-[11px]">34.000</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 text-[11px]">38.500</td>
                    <td className="px-2 py-1.5 text-right font-bold text-green-600 bg-green-50 text-[11px]">31.200</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" /> Menor preço por item destacado em verde
            </p>
          </ContentCard>
          <TipBox type="info">A equalização não premia automaticamente — registre a vencedora no Baseline após a decisão.</TipBox>
        </div>
        <div className="flex flex-col gap-3">
          <Label>Fluxo de trabalho</Label>
          <ContentCard>
            <div className="flex flex-col gap-2.5">
              <Row n={1} title="Verifique os preços" sub="Confirme 100% dos itens preenchidos por fornecedor." />
              <Row n={2} title="Analise os totais" sub="Cabeçalho de cada coluna = valor total da proposta." />
              <Row n={3} title="Filtre por disciplina" sub="Segmente para análise parcial do escopo." />
              <Row n={4} title="Exporte a equalização" sub="Excel completo para apresentação interna." />
            </div>
          </ContentCard>
          <Label>Ações disponíveis</Label>
          <div className="flex flex-wrap gap-2">
            <Pill icon={Filter}   label="Filtrar disciplina" color="bg-slate-700" />
            <Pill icon={Download} label="Exportar Excel"     color="bg-emerald-600" />
          </div>
        </div>
      </div>
    ),
  },

  // ── 8. Análises ───────────────────────────────────────────────────────────────
  {
    icon: BarChart3, title: 'Análises', sub: 'Gráficos, Pareto e Revisões',
    bullets: ['Curva ABC / Pareto por valor', 'Análise por disciplina e categoria', 'Comparativo automático entre revisões'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="flex flex-col gap-2">
          <Label>As 4 abas</Label>
          {[
            { border: 'border-l-blue-400',   title: 'Curva ABC / Pareto',  desc: 'Classifica itens por valor acumulado: A=70%, B=70–90%, C>90%. Total Geral ao lado dos badges.' },
            { border: 'border-l-green-400',  title: 'Disciplinas',         desc: 'Gráfico e tabela por disciplina. Identifica onde está o valor do projeto.' },
            { border: 'border-l-amber-400',  title: 'Categorias',          desc: 'Segmentação por tipo de item: serviços, materiais, equipamentos.' },
            { border: 'border-l-violet-400', title: 'Revisões',            desc: 'Compare duas revisões: adicionados, removidos, alterados (Δ qtd e Δ valor) e inalterados.' },
          ].map(t => (
            <div key={t.title} className={`p-2.5 bg-white border-l-4 ${t.border} rounded-r-xl shadow-sm border border-gray-100 anim-up`}>
              <p className="font-semibold text-xs text-gray-900">{t.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Label>Como acessar</Label>
          <ContentCard>
            <div className="flex flex-col gap-2">
              <Row n={1} title="Projeto Atual → Análises" sub="Menu lateral do projeto." />
              <Row n={2} title="Selecione a revisão" sub="Seletor no topo refaz todos os gráficos." />
              <Row n={3} title="Escolha a aba" sub="ABC, Disciplinas, Categorias ou Revisões." />
            </div>
          </ContentCard>
          <TipBox type="ok"><strong>Estratégia Pareto:</strong> Itens classe A = 70% do valor. Foque a negociação aí para maior impacto.</TipBox>
          <ContentCard>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><Download size={15} className="text-green-600" /></div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Exportar Excel completo</p>
                <p className="text-[11px] text-gray-400">Todas as abas em um único .xlsx</p>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>
    ),
  },

  // ── 9. Baseline ───────────────────────────────────────────────────────────────
  {
    icon: Trophy, title: 'Baseline', sub: 'Histórico de premiações',
    bullets: ['Registrar empresa vencedora', 'Associar valor e data', 'Alimentar o Dashboard automaticamente'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="flex flex-col gap-3">
          <Label>Registrando uma premiação</Label>
          <ContentCard>
            <div className="flex flex-col gap-2.5">
              <Row n={1} title="Acesse o Baseline" sub="Menu lateral → ícone de troféu." />
              <Row n={2} title="Localize a proposta" sub="Propostas agrupadas por projeto." />
              <Row n={3} title="Marque como premiada" sub="Informe data e confirme o valor do contrato." />
              <Row n={4} title="Dashboard atualizado" sub="KPIs e gráficos refletem a premiação imediatamente." />
            </div>
          </ContentCard>
          <TipBox type="info">Baseline é a única fonte de verdade para os valores do Dashboard.</TipBox>
        </div>
        <div className="flex flex-col gap-3">
          <Label>O que é consolidado</Label>
          <div className="flex flex-col gap-2">
            {[
              { icon: Award,     title: 'Empresa vencedora', desc: 'Por projeto e proposta',    c: 'bg-yellow-50 text-yellow-600' },
              { icon: TrendingUp,title: 'Valor premiado',    desc: 'Total do contrato',         c: 'bg-green-50 text-green-600' },
              { icon: BarChart3, title: 'Data de premiação', desc: 'Para análise temporal',     c: 'bg-blue-50 text-blue-600' },
              { icon: Layers,    title: 'Histórico completo',desc: 'Todos os contratos',        c: 'bg-slate-100 text-slate-600' },
            ].map(({ icon: Icon, title, desc, c }) => (
              <div key={title} className="flex gap-2.5 p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c}`}><Icon size={14} /></div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
                  <p className="text-[11px] text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <TipBox type="ok">Mantenha o Baseline atualizado para que o Dashboard reflita o portfólio real.</TipBox>
        </div>
      </div>
    ),
  },

  // ── 10. Dicas ────────────────────────────────────────────────────────────────
  {
    icon: Lightbulb, title: 'Dicas Avançadas', sub: 'Fluxo ideal e boas práticas',
    bullets: ['Fluxo completo de trabalho', 'Checklist de aprovação', 'Perguntas frequentes'],
    right: (
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        <div className="flex flex-col gap-3">
          <Label>Fluxo ideal</Label>
          <ContentCard>
            {[
              { n:1, l:'Criar Projeto',    s:'Nome, status, empresa' },
              { n:2, l:'Montar PQ',        s:'Importar ou inserir itens' },
              { n:3, l:'Criar Rev 0',      s:'Snapshot inicial' },
              { n:4, l:'Propostas',        s:'Uma por fornecedor' },
              { n:5, l:'Equalizar',        s:'Comparar item a item' },
              { n:6, l:'Analisar (Pareto)',s:'Identificar itens críticos' },
              { n:7, l:'Premiar',          s:'Registrar no Baseline' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{s.n}</div>
                <p className="text-xs font-semibold text-gray-800 flex-1">{s.l}</p>
                <p className="text-[10px] text-gray-400">{s.s}</p>
              </div>
            ))}
          </ContentCard>
        </div>
        <div className="flex flex-col gap-3">
          <Label>Checklist de aprovação</Label>
          <ContentCard>
            {['PQ completo com disciplinas e categorias','Revisão criada antes de mudanças de escopo','Todas as propostas 100% precificadas','Análise Pareto executada','Comparativo de revisões gerado','Baseline atualizado'].map(i => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
                <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                <p className="text-[11px] text-gray-600">{i}</p>
              </div>
            ))}
          </ContentCard>
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white text-center">
            <Zap size={18} className="mx-auto mb-1.5 text-yellow-300" />
            <p className="font-bold text-sm mb-0.5">Guia concluído!</p>
            <p className="text-blue-100 text-[11px] leading-relaxed">Este material está sempre disponível no menu lateral para consulta rápida.</p>
          </div>
        </div>
      </div>
    ),
  },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Help() {
  const [active, setActive]       = useState(0)
  const [animKey, setAnimKey]     = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  const ch    = CHAPTERS[active]
  const theme = THEMES[active]

  function goTo(idx: number) {
    if (idx === active || idx < 0 || idx >= CHAPTERS.length) return
    setCompleted(p => new Set([...p, active]))
    setActive(idx)
    setAnimKey(k => k + 1)
  }
  function next() { goTo(active + 1) }
  function prev() { goTo(active - 1) }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==='ArrowRight') next(); if (e.key==='ArrowLeft') prev() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const pct = Math.round(((active + 1) / CHAPTERS.length) * 100)

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div className="flex h-screen overflow-hidden bg-gray-50">

        {/* ── Left Hero Panel ───────────────────────────────────────────────── */}
        <div
          key={`hero-${animKey}`}
          className={`w-72 flex-shrink-0 bg-gradient-to-b ${theme.grad} flex flex-col overflow-hidden relative anim-hero`}
        >
          {/* Decorative big number */}
          <div className="absolute bottom-24 right-0 text-white/5 font-black leading-none select-none pointer-events-none"
               style={{ fontSize: 160 }}>
            {String(active + 1).padStart(2, '0')}
          </div>

          {/* Logo */}
          <div className="px-6 py-5 flex items-center gap-2.5 border-b border-white/10 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <BookOpen size={15} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-xs leading-tight">Guia do Sistema</p>
              <p className="text-white/50 text-[10px]">10 capítulos</p>
            </div>
          </div>

          {/* Chapter content */}
          <div className="flex-1 px-6 py-6 flex flex-col gap-5 justify-center">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <ch.icon size={22} className="text-white" />
            </div>
            {/* Title */}
            <div>
              <p className="text-white/50 text-xs font-medium mb-1">Capítulo {active + 1} de {CHAPTERS.length}</p>
              <h1 className="text-white font-black text-2xl leading-tight">{ch.title}</h1>
              <p className="text-white/60 text-sm mt-1">{ch.sub}</p>
            </div>
            {/* Learning points */}
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2.5">Neste capítulo</p>
              <ul className="space-y-1.5">
                {ch.bullets.map(b => <Bullet key={b}>{b}</Bullet>)}
              </ul>
            </div>
          </div>

          {/* Chapter list (mini) */}
          <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
            <div className="flex gap-1 flex-wrap">
              {CHAPTERS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all duration-200 ${
                    i === active
                      ? 'bg-white text-gray-800 shadow-md scale-110'
                      : completed.has(i)
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/50 hover:bg-white/20'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="text-white/30 text-[10px] mt-2 flex items-center gap-1">
              <kbd className="bg-white/10 px-1 py-0.5 rounded font-mono">←</kbd>
              <kbd className="bg-white/10 px-1 py-0.5 rounded font-mono">→</kbd>
              navegar
            </p>
          </div>
        </div>

        {/* ── Right Content ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-400">
                  {completed.size} de {CHAPTERS.length} capítulos concluídos
                </p>
                <div className="w-48 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                       style={{ width: `${pct}%`, background: theme.accent }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prev} disabled={active === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all">
                <ChevronLeft size={13} /> Anterior
              </button>
              {active < CHAPTERS.length - 1 ? (
                <button onClick={next}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all hover:opacity-90"
                  style={{ background: theme.accent }}>
                  {CHAPTERS[active + 1].title} <ChevronRight size={13} />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg">
                  <CheckCircle2 size={13} /> Concluído
                </div>
              )}
            </div>
          </div>

          {/* Chapter content */}
          <div key={animKey} className="flex-1 overflow-hidden p-5 anim-panel">
            {ch.right}
          </div>
        </div>
      </div>
    </>
  )
}
