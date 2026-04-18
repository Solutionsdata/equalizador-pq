import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, FolderPlus, Table2, GitBranch,
  Building2, BarChart3, Trophy, Lightbulb, ChevronRight, ChevronLeft,
  CheckCircle2, Upload, Download, Plus, ArrowRight, Zap,
  Target, TrendingUp, Filter, Award, AlertCircle, Info,
  BookOpen, Layers, Star,
} from 'lucide-react'

const ANIM_CSS = `
  @keyframes heroIn  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes panelIn { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .anim-hero  { animation: heroIn  .5s cubic-bezier(.22,1,.36,1) both }
  .anim-panel { animation: panelIn .5s cubic-bezier(.22,1,.36,1) both }
  .anim-up    { animation: fadeUp  .4s cubic-bezier(.22,1,.36,1) both }
  .d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.18s}
  .d4{animation-delay:.24s}.d5{animation-delay:.30s}.d6{animation-delay:.36s}
`

const THEMES = [
  { grad: 'from-blue-600 via-blue-700 to-indigo-800',    accent: '#3b82f6' },
  { grad: 'from-emerald-600 via-green-700 to-teal-800',  accent: '#10b981' },
  { grad: 'from-violet-600 via-purple-700 to-fuchsia-800',accent:'#8b5cf6' },
  { grad: 'from-rose-600 via-pink-700 to-red-800',       accent: '#f43f5e' },
  { grad: 'from-amber-500 via-orange-600 to-orange-700', accent: '#f59e0b' },
]

// ── Shared ────────────────────────────────────────────────────────────────────
function Label({ c, children }: { c?: string; children: React.ReactNode }) {
  return <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${c ?? 'text-gray-400'}`}>{children}</p>
}
function Box({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 ${className}`}>{children}</div>
}
function Step({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
      <div>
        <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
function Tip({ children, type = 'info' }: { children: React.ReactNode; type?: 'info'|'warn'|'ok' }) {
  const s = {
    info: { bg:'bg-blue-50 border-blue-200',   ic:'text-blue-500',  tx:'text-blue-800',  I:Info },
    warn: { bg:'bg-amber-50 border-amber-200',  ic:'text-amber-500', tx:'text-amber-800', I:AlertCircle },
    ok:   { bg:'bg-green-50 border-green-200',  ic:'text-green-500', tx:'text-green-800', I:CheckCircle2 },
  }[type]
  return (
    <div className={`flex gap-2 p-2.5 rounded-xl border ${s.bg}`}>
      <s.I size={12} className={`flex-shrink-0 mt-0.5 ${s.ic}`}/>
      <p className={`text-[11px] leading-relaxed ${s.tx}`}>{children}</p>
    </div>
  )
}
function Chip({ icon:Icon, label, color }: { icon:React.ElementType; label:string; color:string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white ${color}`}>
      <Icon size={10}/>{label}
    </span>
  )
}
function ModuleRow({ icon:Icon, title, desc, c }: { icon:React.ElementType; title:string; desc:string; c:string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c}`}><Icon size={14}/></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
        <p className="text-[11px] text-gray-400">{desc}</p>
      </div>
    </div>
  )
}

// ── Pages ─────────────────────────────────────────────────────────────────────
interface Page { icon: React.ElementType; title: string; sub: string; bullets: string[]; right: React.ReactNode }

const PAGES: Page[] = [

  // ── Página 1: Visão Geral + Dashboard ──────────────────────────────────────
  {
    icon: LayoutDashboard, title: 'Visão Geral', sub: 'O sistema e o Dashboard',
    bullets: ['O que é e para quem é', 'Os 5 módulos principais', 'Lendo o Dashboard executivo'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Col 1 — Problema */}
        <div className="flex flex-col gap-3">
          <Label>O problema resolvido</Label>
          <Box>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">Sem o sistema</p>
            {['Excel descentralizado','Sem histórico de revisões','Comparação manual','Zero rastreabilidade'].map(t=>(
              <p key={t} className="flex items-center gap-1.5 text-xs text-red-700 py-0.5"><span className="font-bold text-red-400">✕</span>{t}</p>
            ))}
          </Box>
          <Box>
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1.5">Com o sistema</p>
            {['Tudo centralizado','Revisões versionadas','Equalização automática','Histórico completo'].map(t=>(
              <p key={t} className="flex items-center gap-1.5 text-xs text-green-700 py-0.5"><CheckCircle2 size={11} className="text-green-500"/>{t}</p>
            ))}
          </Box>
        </div>

        {/* Col 2 — Módulos */}
        <div className="flex flex-col gap-3">
          <Label>5 módulos do sistema</Label>
          <div className="flex flex-col gap-1.5">
            <ModuleRow icon={Table2}    title="Planilha PQ"   desc="Quantitativos e referência"       c="bg-blue-50 text-blue-600"/>
            <ModuleRow icon={GitBranch} title="Revisões"      desc="Snapshots imutáveis do PQ"        c="bg-violet-50 text-violet-600"/>
            <ModuleRow icon={Building2} title="Equalização"   desc="Comparação item a item"           c="bg-amber-50 text-amber-600"/>
            <ModuleRow icon={BarChart3} title="Análises"      desc="Pareto, disciplinas e delta"      c="bg-emerald-50 text-emerald-600"/>
            <ModuleRow icon={Trophy}    title="Baseline"      desc="Registro de premiações"           c="bg-yellow-50 text-yellow-600"/>
          </div>
        </div>

        {/* Col 3 — Dashboard */}
        <div className="flex flex-col gap-3">
          <Label>Dashboard — o que ver</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              {icon:Target,    title:'KPIs',           desc:'Projetos e valores',  c:'bg-blue-50 text-blue-600'},
              {icon:TrendingUp,title:'Gráfico',        desc:'Sem./Mês/Ano',        c:'bg-indigo-50 text-indigo-600'},
              {icon:BarChart3, title:'Top projetos',   desc:'Por valor premiado',  c:'bg-green-50 text-green-600'},
              {icon:Star,      title:'Recentes',       desc:'Atalhos rápidos',     c:'bg-amber-50 text-amber-600'},
            ].map(({icon:Icon,title,desc,c})=>(
              <div key={title} className="flex gap-2 p-2.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${c}`}><Icon size={12}/></div>
                <div><p className="text-[11px] font-semibold text-gray-800 leading-tight">{title}</p><p className="text-[10px] text-gray-400">{desc}</p></div>
              </div>
            ))}
          </div>
          <Tip type="info">Os valores do Dashboard vêm do Baseline. Sem premiação registrada, gráficos ficam vazios.</Tip>
          <Box>
            <Label>Acesso rápido no Dashboard</Label>
            <div className="flex flex-col gap-2 mt-1">
              <Step n={1} title="Semana / Mês / Ano" sub="Toggle no gráfico de valores."/>
              <Step n={2} title="Hover no projeto" sub="Revela atalhos para PQ, Equalização e Análises."/>
            </div>
          </Box>
        </div>
      </div>
    ),
  },

  // ── Página 2: Projetos + Planilha PQ ──────────────────────────────────────
  {
    icon: FolderPlus, title: 'Projetos & PQ', sub: 'Criar projetos e quantitativos',
    bullets: ['Criar e configurar um projeto', 'Estrutura de um item PQ', 'Importar e exportar via Excel'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Col 1 — Criar projeto */}
        <div className="flex flex-col gap-3">
          <Label>Criando um projeto</Label>
          <Box>
            <div className="flex flex-col gap-2.5">
              <Step n={1} title="Menu → Projetos" sub="Ícone de pasta no menu lateral."/>
              <Step n={2} title="+ Novo Projeto" sub="Botão azul no canto superior direito."/>
              <Step n={3} title="Preencha os dados" sub="Nome, descrição, empresa, status."/>
              <Step n={4} title="Salve e entre" sub="Menu Projeto Atual aparece na sidebar."/>
            </div>
          </Box>
          <Label>Status disponíveis</Label>
          <div className="flex flex-col gap-1.5">
            {[{l:'Em Andamento',c:'bg-blue-50 text-blue-700 border-blue-100'},{l:'Concluído',c:'bg-green-50 text-green-700 border-green-100'},{l:'Cancelado',c:'bg-gray-100 text-gray-500 border-gray-100'}].map(s=>(
              <div key={s.l} className={`px-3 py-1.5 rounded-xl border text-xs font-semibold text-center ${s.c}`}>{s.l}</div>
            ))}
          </div>
          <Tip type="warn">Excluir remove <strong>todos os dados vinculados</strong> permanentemente.</Tip>
        </div>

        {/* Col 2 — Estrutura PQ */}
        <div className="flex flex-col gap-3">
          <Label>Campos de um item PQ</Label>
          <Box>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {[['Código','EST-001','✓'],['Descrição','Escavação mecânica','✓'],['Unidade','m³','✓'],['Quantidade','1.500','✓'],['Preço Ref.','R$ 45,00','—'],['Disciplina','Terraplenagem','—'],['Categoria','Serviços','—']].map(([c,e,r])=>(
                  <tr key={c}>
                    <td className="py-1.5 font-medium text-gray-700 w-1/3 text-[11px]">{c}</td>
                    <td className="py-1.5 text-gray-400 font-mono text-[11px]">{e}</td>
                    <td className="py-1.5 text-center">{r==='✓'?<span className="text-green-500 font-bold text-[11px]">✓</span>:<span className="text-gray-200 text-[11px]">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <Tip type="info">Use Disciplina e Categoria consistentemente — alimentam os gráficos de Análises.</Tip>
        </div>

        {/* Col 3 — Inserir dados */}
        <div className="flex flex-col gap-3">
          <Label>Como inserir dados no PQ</Label>
          <Box className="border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center"><Upload size={12} className="text-green-600"/></div>
                <p className="text-xs font-semibold text-gray-800">Importar Excel</p>
              </div>
              <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold">Recomendado</span>
            </div>
            <ol className="text-[11px] text-gray-500 space-y-1 list-decimal list-inside">
              <li>Clique em <strong>Baixar Template</strong></li>
              <li>Preencha o arquivo com seus itens</li>
              <li>Faça upload com <strong>Importar</strong></li>
            </ol>
          </Box>
          <Box>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center"><Plus size={12} className="text-blue-600"/></div>
              <p className="text-xs font-semibold text-gray-800">Inserção manual</p>
            </div>
            <p className="text-[11px] text-gray-500">Clique em <strong>+ Adicionar Item</strong> e edite diretamente na tabela.</p>
          </Box>
          <Box>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center"><Download size={12} className="text-amber-600"/></div>
              <p className="text-xs font-semibold text-gray-800">Exportar Excel</p>
            </div>
            <p className="text-[11px] text-gray-500">Baixe o PQ atual em .xlsx para compartilhar ou auditar.</p>
          </Box>
        </div>
      </div>
    ),
  },

  // ── Página 3: Revisões + Propostas ────────────────────────────────────────
  {
    icon: GitBranch, title: 'Revisões & Propostas', sub: 'Versionar o PQ e cadastrar fornecedores',
    bullets: ['Criar snapshots do PQ', 'Comparar duas revisões', 'Cadastrar e precificar propostas'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Col 1 — Revisões */}
        <div className="flex flex-col gap-3">
          <Label>O que são revisões</Label>
          <Box>
            <p className="text-[11px] text-gray-600 leading-relaxed mb-3">Snapshots <strong>imutáveis</strong> do PQ. Alterações futuras não afetam revisões já criadas.</p>
            <div className="flex items-center gap-1">
              {[{l:'Rev 0',c:'bg-blue-600'},{l:'Rev 1',c:'bg-violet-600'},{l:'Rev 2',c:'bg-indigo-600'}].map((r,i,a)=>(
                <React.Fragment key={r.l}>
                  <span className={`${r.c} text-white text-[10px] font-bold px-2 py-1 rounded-md`}>{r.l}</span>
                  {i<a.length-1&&<ArrowRight size={10} className="text-gray-300"/>}
                </React.Fragment>
              ))}
            </div>
          </Box>
          <Box>
            <Label>Criar uma revisão</Label>
            <div className="flex flex-col gap-2 mt-1">
              <Step n={1} title="Equalização → + Nova Revisão"/>
              <Step n={2} title="Número sugerido automaticamente"/>
              <Step n={3} title="Adicione uma descrição" sub="Ex.: Addendum 01 — itens de drenagem"/>
            </div>
          </Box>
          <Tip type="ok">Crie uma revisão <strong>antes</strong> de alterar o PQ para garantir rastreabilidade.</Tip>
        </div>

        {/* Col 2 — Comparar revisões */}
        <div className="flex flex-col gap-3">
          <Label>Comparativo em Análises</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {[{l:'Adicionados',c:'bg-green-50 text-green-700 border-green-100'},{l:'Removidos',c:'bg-red-50 text-red-700 border-red-100'},{l:'Alterados',c:'bg-amber-50 text-amber-700 border-amber-100'},{l:'Inalterados',c:'bg-gray-50 text-gray-500 border-gray-100'}].map(b=>(
              <div key={b.l} className={`p-2 rounded-xl border text-center text-[11px] font-semibold ${b.c}`}>{b.l}</div>
            ))}
          </div>
          <Box>
            <Label>Colunas nos itens alterados</Label>
            <table className="w-full text-[11px] mt-1">
              <tbody className="divide-y divide-gray-100">
                {[['Qtd A / B','Quantidade nas revisões'],['Δ Qtd','Variação numérica'],['Δ Valor','Diferença em R$'],['Campos','Outros campos alterados']].map(([c,d])=>(
                  <tr key={c}><td className="py-1 font-mono text-gray-600 w-1/3">{c}</td><td className="py-1 text-gray-400">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </Box>
        </div>

        {/* Col 3 — Propostas */}
        <div className="flex flex-col gap-3">
          <Label>Criando uma proposta</Label>
          <Box>
            <div className="flex flex-col gap-2">
              <Step n={1} title="Equalização do projeto"/>
              <Step n={2} title="Escolha a revisão destino"/>
              <Step n={3} title="+ Nova Proposta"/>
              <Step n={4} title="Empresa, protocolo e data"/>
            </div>
          </Box>
          <Box className="border border-amber-100">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-800">Template Excel</p>
              <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">Recomendado</span>
            </div>
            <ol className="text-[11px] text-gray-500 space-y-0.5 list-decimal list-inside">
              <li>Baixar Template da proposta</li>
              <li>Preencher a coluna Preço Unitário</li>
              <li>Importar Excel de volta</li>
            </ol>
          </Box>
          <Tip type="warn">Nova revisão = novas propostas. Cada proposta fica vinculada à revisão de origem.</Tip>
        </div>
      </div>
    ),
  },

  // ── Página 4: Equalização + Análises ──────────────────────────────────────
  {
    icon: BarChart3, title: 'Equalização & Análises', sub: 'Comparar fornecedores e extrair insights',
    bullets: ['Ler a tabela de equalização', 'Filtrar e exportar resultados', 'Curva ABC, Pareto e comparativo de revisões'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Col 1 — Tabela equalização */}
        <div className="flex flex-col gap-3">
          <Label>Tabela de equalização</Label>
          <Box>
            <div className="overflow-hidden rounded-lg border border-gray-200 text-xs">
              <table className="w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left text-[10px]">Item</th>
                    <th className="px-2 py-2 text-right text-[10px]">Ref.</th>
                    <th className="px-2 py-2 text-right text-green-300 text-[10px]">A</th>
                    <th className="px-2 py-2 text-right text-[10px]">B</th>
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
            <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block"/>
              Menor preço por item em verde
            </p>
          </Box>
          <Box>
            <Label>Fluxo na equalização</Label>
            <div className="flex flex-col gap-2 mt-1">
              <Step n={1} title="Verifique os preços" sub="100% dos itens preenchidos."/>
              <Step n={2} title="Analise os totais" sub="Cabeçalho = valor total por proposta."/>
              <Step n={3} title="Filtre por disciplina"/>
            </div>
          </Box>
        </div>

        {/* Col 2 — 4 abas */}
        <div className="flex flex-col gap-3">
          <Label>4 abas de Análises</Label>
          {[
            {border:'border-l-blue-400',   title:'Curva ABC / Pareto',  desc:'A=70% · B=70–90% · C>90%. Total Geral ao lado dos badges. Fonte: Referência ou Propostas.'},
            {border:'border-l-green-400',  title:'Disciplinas',         desc:'Gráfico e tabela agrupados por disciplina.'},
            {border:'border-l-amber-400',  title:'Categorias',          desc:'Segmentação por tipo: serviços, materiais, equipamentos.'},
            {border:'border-l-violet-400', title:'Revisões',            desc:'Adicionados · Removidos · Alterados (Δ Qtd e Δ Valor) · Inalterados.'},
          ].map(t=>(
            <div key={t.title} className={`p-2.5 bg-white border-l-4 ${t.border} rounded-r-xl shadow-sm border border-gray-100`}>
              <p className="font-semibold text-xs text-gray-900">{t.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Col 3 — uso */}
        <div className="flex flex-col gap-3">
          <Label>Como usar as Análises</Label>
          <Box>
            <div className="flex flex-col gap-2.5">
              <Step n={1} title="Projeto Atual → Análises"/>
              <Step n={2} title="Selecione a revisão" sub="Seletor no topo refaz todos os gráficos."/>
              <Step n={3} title="Escolha a aba" sub="ABC, Disciplinas, Categorias ou Revisões."/>
              <Step n={4} title="Exporte o resultado" sub="Excel com todas as abas consolidadas."/>
            </div>
          </Box>
          <Tip type="ok"><strong>Estratégia Pareto:</strong> Itens classe A = 70% do valor. Priorize-os na negociação.</Tip>
          <div className="flex flex-wrap gap-2">
            <Chip icon={Filter}   label="Filtrar disciplina"  color="bg-slate-700"/>
            <Chip icon={Download} label="Exportar Excel"      color="bg-emerald-600"/>
          </div>
        </div>
      </div>
    ),
  },

  // ── Página 5: Baseline + Dicas ────────────────────────────────────────────
  {
    icon: Trophy, title: 'Baseline & Dicas', sub: 'Premiar e boas práticas',
    bullets: ['Registrar empresa vencedora', 'Alimentar o Dashboard', 'Fluxo completo e checklist'],
    right: (
      <div className="grid grid-cols-3 gap-3 h-full content-start">

        {/* Col 1 — Baseline */}
        <div className="flex flex-col gap-3">
          <Label>Registrando uma premiação</Label>
          <Box>
            <div className="flex flex-col gap-2.5">
              <Step n={1} title="Menu → Baseline" sub="Ícone de troféu no menu lateral."/>
              <Step n={2} title="Localize a proposta" sub="Agrupadas por projeto."/>
              <Step n={3} title="Marque como premiada" sub="Informe data e valor do contrato."/>
              <Step n={4} title="Dashboard atualizado" sub="KPIs e gráficos refletem imediatamente."/>
            </div>
          </Box>
          <Label>O que é consolidado</Label>
          <div className="flex flex-col gap-1.5">
            {[{icon:Award,title:'Empresa vencedora',c:'bg-yellow-50 text-yellow-600'},{icon:TrendingUp,title:'Valor premiado',c:'bg-green-50 text-green-600'},{icon:BarChart3,title:'Data de premiação',c:'bg-blue-50 text-blue-600'},{icon:Layers,title:'Histórico completo',c:'bg-slate-100 text-slate-600'}].map(({icon:Icon,title,c})=>(
              <div key={title} className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${c}`}><Icon size={12}/></div>
                <p className="text-[11px] font-semibold text-gray-700">{title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2 — Fluxo ideal */}
        <div className="flex flex-col gap-3">
          <Label>Fluxo ideal de trabalho</Label>
          <Box>
            {[{n:1,l:'Criar Projeto',s:'Nome, status, empresa'},{n:2,l:'Montar PQ',s:'Importar ou inserir'},{n:3,l:'Criar Rev 0',s:'Snapshot inicial'},{n:4,l:'Propostas',s:'Uma por fornecedor'},{n:5,l:'Equalizar',s:'Comparar item a item'},{n:6,l:'Analisar',s:'Pareto + Disciplinas'},{n:7,l:'Premiar',s:'Registrar no Baseline'}].map(s=>(
              <div key={s.n} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{s.n}</div>
                <p className="text-xs font-semibold text-gray-800 flex-1">{s.l}</p>
                <p className="text-[10px] text-gray-400">{s.s}</p>
              </div>
            ))}
          </Box>
        </div>

        {/* Col 3 — Checklist + Fim */}
        <div className="flex flex-col gap-3">
          <Label>Checklist de aprovação</Label>
          <Box>
            {['PQ completo com disciplinas e categorias','Revisão criada antes de mudanças','Todas as propostas 100% precificadas','Análise Pareto executada','Comparativo de revisões gerado','Baseline atualizado com vencedor'].map(i=>(
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <CheckCircle2 size={12} className="text-green-500 flex-shrink-0"/>
                <p className="text-[11px] text-gray-600">{i}</p>
              </div>
            ))}
          </Box>
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white text-center">
            <Zap size={18} className="mx-auto mb-1.5 text-yellow-300"/>
            <p className="font-bold text-sm mb-0.5">Guia concluído!</p>
            <p className="text-blue-100 text-[11px] leading-relaxed">Disponível no menu lateral para consulta rápida a qualquer momento.</p>
          </div>
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
  const theme = THEMES[active]

  function goTo(idx: number) {
    if (idx === active || idx < 0 || idx >= PAGES.length) return
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

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div className="flex h-screen overflow-hidden bg-gray-50">

        {/* ── Hero panel ───────────────────────────────────────────────────── */}
        <div key={`hero-${animKey}`}
          className={`w-64 flex-shrink-0 bg-gradient-to-b ${theme.grad} flex flex-col overflow-hidden relative anim-hero`}>

          {/* Decorative number */}
          <div className="absolute bottom-20 right-0 text-white/5 font-black leading-none select-none pointer-events-none"
               style={{ fontSize:160 }}>
            {String(active + 1)}
          </div>

          {/* Logo */}
          <div className="px-5 py-4 flex items-center gap-2.5 border-b border-white/10 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
              <BookOpen size={14} className="text-white"/>
            </div>
            <div>
              <p className="text-white font-bold text-xs leading-tight">Guia do Sistema</p>
              <p className="text-white/50 text-[10px]">5 capítulos</p>
            </div>
          </div>

          {/* Chapter info */}
          <div className="flex-1 px-5 py-5 flex flex-col gap-5 justify-center">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <page.icon size={20} className="text-white"/>
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium mb-1">Capítulo {active+1} de {PAGES.length}</p>
              <h1 className="text-white font-black text-xl leading-tight">{page.title}</h1>
              <p className="text-white/60 text-xs mt-1">{page.sub}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Neste capítulo</p>
              <ul className="space-y-1.5">
                {page.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-white/75 text-xs leading-relaxed">
                    <CheckCircle2 size={11} className="flex-shrink-0 mt-0.5 text-white/40"/>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Page dots */}
          <div className="px-5 py-3 border-t border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              {PAGES.map((_, i) => (
                <button key={i} onClick={() => goTo(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === active ? 'w-6 h-2 bg-white' : completed.has(i) ? 'w-2 h-2 bg-white/50' : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                  }`}/>
              ))}
            </div>
            <p className="text-white/30 text-[10px] flex items-center gap-1">
              <kbd className="bg-white/10 px-1 py-0.5 rounded font-mono">←</kbd>
              <kbd className="bg-white/10 px-1 py-0.5 rounded font-mono">→</kbd>
              navegar
            </p>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width:`${((active+1)/PAGES.length)*100}%`, background: theme.accent }}/>
              </div>
              <p className="text-xs text-gray-400">{Math.round(((active+1)/PAGES.length)*100)}%</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prev} disabled={active===0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all">
                <ChevronLeft size={13}/> Anterior
              </button>
              {active < PAGES.length-1 ? (
                <button onClick={next}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all hover:opacity-90"
                  style={{ background: theme.accent }}>
                  {PAGES[active+1].title} <ChevronRight size={13}/>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg">
                  <CheckCircle2 size={13}/> Concluído
                </div>
              )}
            </div>
          </div>

          {/* Page content */}
          <div key={animKey} className="flex-1 overflow-hidden p-4 anim-panel">
            {page.right}
          </div>
        </div>
      </div>
    </>
  )
}
