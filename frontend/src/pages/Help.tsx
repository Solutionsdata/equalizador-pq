import React, { useState, useEffect, useRef } from 'react'
import {
  BookOpen, LayoutDashboard, FolderPlus, Table2, GitBranch,
  Building2, BarChart3, Trophy, Lightbulb, ChevronRight,
  ChevronLeft, CheckCircle2, Upload, Download, Plus, Search,
  ArrowRight, Play, Star, Zap, Target, TrendingUp, FileSpreadsheet,
  RefreshCw, Filter, Eye, Award, AlertCircle, Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Chapter {
  id: number
  icon: React.ElementType
  color: string
  bg: string
  title: string
  subtitle: string
  content: React.ReactNode
}

// ─── Shared Components ────────────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mt-0.5">
        {n}
      </div>
      <div className="flex-1 pb-6 border-l-2 border-blue-100 pl-4 -ml-0">
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <div className="text-gray-600 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Tip({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warn' | 'success' }) {
  const styles = {
    info: { box: 'bg-blue-50 border-blue-200', icon: 'text-blue-500', text: 'text-blue-800', Icon: Info },
    warn: { box: 'bg-amber-50 border-amber-200', icon: 'text-amber-500', text: 'text-amber-800', Icon: AlertCircle },
    success: { box: 'bg-green-50 border-green-200', icon: 'text-green-500', text: 'text-green-800', Icon: CheckCircle2 },
  }
  const s = styles[type]
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${s.box} my-4`}>
      <s.Icon size={18} className={`flex-shrink-0 mt-0.5 ${s.icon}`} />
      <p className={`text-sm leading-relaxed ${s.text}`}>{children}</p>
    </div>
  )
}

function Action({ icon: Icon, label, color = 'blue' }: { icon: React.ElementType; label: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    amber: 'bg-amber-500 text-white',
    slate: 'bg-slate-700 text-white',
    indigo: 'bg-indigo-600 text-white',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${colors[color] || colors.blue}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}

function Card({ icon: Icon, title, desc, color = 'blue' }: { icon: React.ElementType; title: string; desc: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className="flex gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color] || colors.blue}`}>
        <Icon size={20} />
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-100">{children}</h3>
  )
}

// ─── Chapter Contents ─────────────────────────────────────────────────────────
const chapters: Chapter[] = [
  {
    id: 1,
    icon: Play,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    title: 'Bem-vindo',
    subtitle: 'O que é e para quem é',
    content: (
      <div>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center gap-2 text-blue-200 text-sm font-medium mb-3">
            <Star size={14} /> Software de Equalização de Propostas
          </div>
          <h2 className="text-2xl font-bold mb-3">Uma plataforma completa para quem compra obras e serviços</h2>
          <p className="text-blue-100 leading-relaxed">
            O Equalizador PQ transforma o processo manual e fragmentado de análise de propostas em
            um fluxo digital, rastreável e auditável — do quantitativo até a premiação.
          </p>
        </div>

        <SectionTitle>O problema que resolvemos</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Sem o sistema</p>
            <ul className="space-y-1.5 text-sm text-red-700">
              {['Planilhas Excel descentralizadas', 'Sem histórico de revisões', 'Difícil comparar fornecedores', 'Zero rastreabilidade de premiação'].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="text-red-400">✕</span> {t}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Com o sistema</p>
            <ul className="space-y-1.5 text-sm text-green-700">
              {['Tudo centralizado e versionado', 'Revisões com comparação automática', 'Equalização lado a lado', 'Baseline com histórico completo'].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 size={13} className="text-green-500" /> {t}</li>
              ))}
            </ul>
          </div>
        </div>

        <SectionTitle>Os 5 módulos principais</SectionTitle>
        <div className="grid grid-cols-1 gap-3">
          <Card icon={Table2} title="Planilha PQ" desc="Quantitativos do projeto: itens, unidades, quantidades e preço de referência." color="blue" />
          <Card icon={GitBranch} title="Revisões" desc="Versiona o PQ. Cada revisão é um snapshot imutável comparável com qualquer outra." color="indigo" />
          <Card icon={Building2} title="Propostas & Equalização" desc="Cadastre fornecedores, importe preços e compare lado a lado por item." color="amber" />
          <Card icon={BarChart3} title="Análises" desc="Curva ABC/Pareto, disciplinas, delta entre revisões e ranking de fornecedores." color="green" />
          <Card icon={Trophy} title="Baseline" desc="Registra a empresa vencedora de cada contrato e o valor premiado." color="purple" />
        </div>

        <Tip type="success">
          Este guia tem 10 capítulos. Siga a ordem para um aprendizado progressivo, ou use o menu lateral para ir direto ao tópico de interesse.
        </Tip>
      </div>
    ),
  },
  {
    id: 2,
    icon: LayoutDashboard,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    title: 'Dashboard',
    subtitle: 'Visão executiva do portfólio',
    content: (
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          O Dashboard é a tela inicial. Ele consolida todos os projetos em uma visão executiva para acompanhar o portfólio em tempo real.
        </p>

        <SectionTitle>O que você vai encontrar</SectionTitle>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: Target, title: 'KPIs do portfólio', desc: 'Total de projetos, em andamento, concluídos e valor total equalizado', color: 'blue' },
            { icon: TrendingUp, title: 'Valores ao longo do tempo', desc: 'Gráfico de área com toggle semana / mês / ano', color: 'indigo' },
            { icon: BarChart3, title: 'Top projetos por valor', desc: 'Ranking horizontal dos projetos com maior valor premiado', color: 'green' },
            { icon: FolderPlus, title: 'Projetos recentes', desc: 'Lista dos últimos projetos com acesso rápido às funcionalidades', color: 'amber' },
          ].map((c) => <Card key={c.title} {...c} />)}
        </div>

        <SectionTitle>Como navegar</SectionTitle>
        <div className="space-y-1">
          <Step n={1} title="Acesse o Dashboard">
            Clique em <strong>Dashboard</strong> no menu lateral esquerdo. É sempre a primeira opção.
          </Step>
          <Step n={2} title="Escolha o período do gráfico">
            No gráfico de evolução de valores, use os botões <strong>Semana / Mês / Ano</strong> no canto superior direito do card para alternar a granularidade.
          </Step>
          <Step n={3} title="Acesse um projeto rapidamente">
            Em <em>Projetos Recentes</em>, passe o mouse sobre o projeto para revelar os atalhos: <strong>Planilha PQ</strong>, <strong>Equalização</strong> e <strong>Análises</strong>.
          </Step>
        </div>

        <Tip type="info">
          Os valores do Dashboard são calculados em tempo real a partir do Baseline (propostas premiadas). Se ainda não há premiação registrada, os gráficos exibirão estado vazio.
        </Tip>
      </div>
    ),
  },
  {
    id: 3,
    icon: FolderPlus,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    title: 'Projetos',
    subtitle: 'Criar e organizar licitações',
    content: (
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Cada projeto representa uma licitação ou contratação. Tudo no sistema — PQ, propostas, análises — está vinculado a um projeto.
        </p>

        <SectionTitle>Criando um projeto</SectionTitle>
        <div className="space-y-1">
          <Step n={1} title="Vá até Projetos">
            No menu lateral, clique em <strong>Projetos</strong> (ícone de pasta).
          </Step>
          <Step n={2} title="Clique em Novo Projeto">
            Use o botão <Action icon={Plus} label="Novo Projeto" color="blue" /> no canto superior direito.
          </Step>
          <Step n={3} title="Preencha os dados">
            <ul className="mt-2 space-y-1">
              <li><strong>Nome</strong> — identificação do projeto (ex.: "Reforma Sede 2025")</li>
              <li><strong>Descrição</strong> — breve resumo do escopo</li>
              <li><strong>Empresa</strong> — empresa contratante</li>
              <li><strong>Status</strong> — Em andamento · Concluído · Cancelado</li>
            </ul>
          </Step>
          <Step n={4} title="Salve e acesse">
            Após salvar, o projeto aparecerá na lista. Clique sobre ele para entrar e ver o menu <strong>Projeto Atual</strong> na sidebar.
          </Step>
        </div>

        <SectionTitle>Status e organização</SectionTitle>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', desc: 'Licitação em curso' },
            { label: 'Concluído', color: 'bg-green-100 text-green-700', desc: 'Contrato premiado' },
            { label: 'Cancelado', color: 'bg-gray-100 text-gray-500', desc: 'Processo encerrado' },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>
              <p className="text-xs text-gray-400 mt-2">{s.desc}</p>
            </div>
          ))}
        </div>

        <Tip type="warn">
          Ao excluir um projeto, <strong>todos os dados vinculados</strong> (PQ, propostas, revisões) são removidos permanentemente. Esta ação não pode ser desfeita.
        </Tip>
      </div>
    ),
  },
  {
    id: 4,
    icon: Table2,
    color: 'text-green-600',
    bg: 'bg-green-100',
    title: 'Planilha PQ',
    subtitle: 'Quantitativos do projeto',
    content: (
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          O PQ (Planilha de Quantitativos) é a espinha dorsal do projeto. Aqui você define cada item de serviço ou material com sua descrição, unidade, quantidade e preço de referência.
        </p>

        <SectionTitle>Estrutura de um item PQ</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-gray-200 mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Campo', 'Exemplo', 'Obrigatório'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Código', 'EST-001', '✓'],
                ['Descrição', 'Escavação mecânica em solo', '✓'],
                ['Unidade', 'm³', '✓'],
                ['Quantidade', '1.500,00', '✓'],
                ['Preço Referência', 'R$ 45,00', '—'],
                ['Disciplina', 'Terraplenagem', '—'],
                ['Categoria', 'Serviços', '—'],
              ].map(([c, e, o]) => (
                <tr key={c} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{c}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{e}</td>
                  <td className="px-4 py-2.5 text-center">{o === '✓' ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SectionTitle>Formas de inserir dados</SectionTitle>
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="p-4 bg-white border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                <Plus size={13} className="text-blue-600" />
              </div>
              <span className="font-semibold text-sm text-gray-800">Inserção manual</span>
            </div>
            <p className="text-xs text-gray-500">Clique em <strong>+ Adicionar Item</strong> e preencha os campos diretamente na tabela. Ideal para projetos pequenos ou ajustes pontuais.</p>
          </div>
          <div className="p-4 bg-white border border-green-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                <Upload size={13} className="text-green-600" />
              </div>
              <span className="font-semibold text-sm text-gray-800">Importar Excel</span>
            </div>
            <p className="text-xs text-gray-500">Clique em <strong>Baixar Template</strong> para obter o modelo, preencha na sua planilha e depois <strong>Importar</strong>. Ideal para grandes quantitativos.</p>
          </div>
          <div className="p-4 bg-white border border-amber-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
                <Download size={13} className="text-amber-600" />
              </div>
              <span className="font-semibold text-sm text-gray-800">Exportar Excel</span>
            </div>
            <p className="text-xs text-gray-500">Use <strong>Exportar</strong> para baixar o PQ atual em .xlsx. Útil para compartilhar com a equipe ou auditar os dados.</p>
          </div>
        </div>

        <Tip type="info">
          <strong>Dica de produtividade:</strong> Use o campo <em>Disciplina</em> e <em>Categoria</em> consistentemente. Eles alimentam os gráficos de Análises e permitem filtrar na equalização.
        </Tip>
      </div>
    ),
  },
  {
    id: 5,
    icon: GitBranch,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
    title: 'Revisões',
    subtitle: 'Versionamento do PQ',
    content: (
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Revisões são snapshots imutáveis do PQ em um determinado momento. Permitem rastrear mudanças de escopo ao longo do processo licitatório.
        </p>

        <SectionTitle>Como revisões funcionam</SectionTitle>
        <div className="relative mb-8">
          <div className="absolute top-5 left-6 right-6 h-0.5 bg-gradient-to-r from-blue-300 via-violet-300 to-green-300 z-0" />
          <div className="relative z-10 flex justify-between">
            {[
              { label: 'Rev 0', desc: 'Inicial', color: 'bg-blue-600' },
              { label: 'Rev 1', desc: 'Addendum', color: 'bg-violet-600' },
              { label: 'Rev 2', desc: 'Retificação', color: 'bg-indigo-600' },
            ].map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full ${r.color} text-white flex items-center justify-center text-xs font-bold shadow-md`}>{r.label}</div>
                <span className="text-xs text-gray-500">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <SectionTitle>Criando uma revisão</SectionTitle>
        <div className="space-y-1">
          <Step n={1} title="Acesse a Equalização do projeto">
            No menu Projeto Atual, clique em <strong>Equalização</strong>.
          </Step>
          <Step n={2} title="Clique em + Nova Revisão">
            No painel de revisões (topo da página), clique em <Action icon={Plus} label="Nova Revisão" color="indigo" />.
          </Step>
          <Step n={3} title="Defina número e descrição">
            O sistema sugere o próximo número automaticamente. Adicione uma descrição como <em>"Addendum 01 — inclusão de itens de drenagem"</em>.
          </Step>
          <Step n={4} title="A revisão é criada com os dados atuais do PQ">
            Após criar, os itens do PQ naquele momento são vinculados à revisão. Alterações futuras no PQ <strong>não afetam revisões já criadas</strong>.
          </Step>
        </div>

        <SectionTitle>Comparando revisões</SectionTitle>
        <p className="text-sm text-gray-600 mb-3">
          Em <strong>Análises → Aba Revisões</strong>, selecione duas revisões para ver automaticamente:
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'Itens Adicionados', color: 'bg-green-100 text-green-700 border-green-200' },
            { label: 'Itens Removidos', color: 'bg-red-100 text-red-700 border-red-200' },
            { label: 'Itens Alterados', color: 'bg-amber-100 text-amber-700 border-amber-200' },
            { label: 'Sem Alteração', color: 'bg-gray-100 text-gray-600 border-gray-200' },
          ].map((b) => (
            <div key={b.label} className={`p-3 rounded-xl border text-center text-xs font-semibold ${b.color}`}>{b.label}</div>
          ))}
        </div>

        <Tip type="success">
          <strong>Boas práticas:</strong> Crie uma revisão antes de fazer alterações significativas no PQ. Isso garante rastreabilidade completa das mudanças de escopo.
        </Tip>
      </div>
    ),
  },
  {
    id: 6,
    icon: FileSpreadsheet,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    title: 'Propostas',
    subtitle: 'Cadastrar fornecedores e preços',
    content: (
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          As propostas representam as ofertas de cada fornecedor (licitante). Para cada proposta você cadastra os preços unitários de cada item do PQ.
        </p>

        <SectionTitle>Criando uma proposta</SectionTitle>
        <div className="space-y-1">
          <Step n={1} title="Vá para Equalização">
            No menu lateral (Projeto Atual), clique em <strong>Equalização</strong>.
          </Step>
          <Step n={2} title="Escolha a revisão destino">
            As propostas são vinculadas a uma revisão. Identifique o painel da revisão correta.
          </Step>
          <Step n={3} title="Clique em + Nova Proposta">
            Dentro do painel da revisão, clique em <Action icon={Plus} label="Nova Proposta" color="amber" />.
          </Step>
          <Step n={4} title="Preencha os dados da proposta">
            <ul className="mt-1 space-y-1 text-xs">
              <li><strong>Empresa</strong> — nome do licitante</li>
              <li><strong>Número / Protocolo</strong> — referência da proposta</li>
              <li><strong>Data</strong> — data de recebimento</li>
            </ul>
          </Step>
        </div>

        <SectionTitle>Inserindo preços</SectionTitle>
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="p-4 bg-white border border-amber-100 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-gray-800">Template Excel</span>
              <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Recomendado</span>
            </div>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Clique em <strong>Baixar Template</strong> da proposta</li>
              <li>O arquivo vem preenchido com todos os itens do PQ</li>
              <li>Preencha a coluna <em>Preço Unitário</em> para cada item</li>
              <li>Faça upload com <strong>Importar Excel</strong></li>
            </ol>
          </div>
          <div className="p-4 bg-white border border-gray-100 rounded-xl">
            <span className="font-semibold text-sm text-gray-800">Inserção manual</span>
            <p className="text-xs text-gray-500 mt-1">Clique sobre a proposta para expandir e edite os preços diretamente na tabela. Use Tab para navegar entre campos.</p>
          </div>
        </div>

        <Tip type="warn">
          Cada proposta é vinculada a uma revisão específica. Se o PQ mudar e você criar uma nova revisão, será necessário criar novas propostas (ou importá-las) nessa revisão.
        </Tip>
      </div>
    ),
  },
  {
    id: 7,
    icon: Building2,
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    title: 'Equalização',
    subtitle: 'Comparar e selecionar propostas',
    content: (
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          A equalização é a etapa central: comparar as propostas de todos os fornecedores item a item para identificar o menor preço global e por disciplina.
        </p>

        <SectionTitle>Lendo o painel de equalização</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-gray-200 mb-6">
          <table className="w-full text-xs">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left">Item / Desc.</th>
                <th className="px-3 py-2.5 text-right">Referência</th>
                <th className="px-3 py-2.5 text-right text-green-300">Fornec. A</th>
                <th className="px-3 py-2.5 text-right">Fornec. B</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              <tr>
                <td className="px-3 py-2 text-gray-700">EST-001 Escavação</td>
                <td className="px-3 py-2 text-right text-gray-500">R$ 67.500</td>
                <td className="px-3 py-2 text-right font-bold text-green-600 bg-green-50">R$ 58.200</td>
                <td className="px-3 py-2 text-right text-gray-500">R$ 72.000</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-700">DRE-001 Drenagem</td>
                <td className="px-3 py-2 text-right text-gray-500">R$ 34.000</td>
                <td className="px-3 py-2 text-right text-gray-500">R$ 38.500</td>
                <td className="px-3 py-2 text-right font-bold text-green-600 bg-green-50">R$ 31.200</td>
              </tr>
            </tbody>
          </table>
          <div className="bg-gray-50 px-3 py-2 text-xs text-gray-400 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            Menor preço por item é destacado em verde
          </div>
        </div>

        <SectionTitle>Fluxo de trabalho</SectionTitle>
        <div className="space-y-1">
          <Step n={1} title="Verifique que todas as propostas estão preenchidas">
            Revise se os preços foram importados/inseridos corretamente para todos os itens.
          </Step>
          <Step n={2} title="Analise os totais por fornecedor">
            O cabeçalho de cada coluna mostra o valor total da proposta. Use para uma comparação rápida.
          </Step>
          <Step n={3} title="Use filtros para analisar por disciplina">
            Utilize <Action icon={Filter} label="Filtrar" color="slate" /> para segmentar a visualização por disciplina ou categoria.
          </Step>
          <Step n={4} title="Exporte para referência">
            Use <Action icon={Download} label="Exportar" color="green" /> para gerar um Excel com a equalização completa para apresentação interna.
          </Step>
        </div>

        <Tip type="info">
          A equalização não "premia" automaticamente — o registro da empresa vencedora é feito manualmente no <strong>Baseline</strong> após a decisão final.
        </Tip>
      </div>
    ),
  },
  {
    id: 8,
    icon: BarChart3,
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    title: 'Análises',
    subtitle: 'Gráficos, Pareto e Revisões',
    content: (
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          O módulo de Análises transforma os dados brutos em inteligência. Acesse em <strong>Projeto Atual → Análises</strong>.
        </p>

        <SectionTitle>As 4 abas de análise</SectionTitle>
        <div className="space-y-3 mb-6">
          <div className="p-4 bg-white border-l-4 border-blue-400 rounded-r-xl shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900 mb-1">Curva ABC / Pareto</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Classifica os itens por valor acumulado: <strong className="text-blue-600">A</strong> (até 70%), <strong className="text-amber-600">B</strong> (70–90%) e <strong className="text-gray-600">C</strong> (acima de 90%). O Total Geral aparece no topo ao lado dos badges. Troque a fonte entre <em>Referência</em> e <em>Propostas</em>.
            </p>
          </div>
          <div className="p-4 bg-white border-l-4 border-green-400 rounded-r-xl shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900 mb-1">Disciplinas</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Gráfico de barras e tabela mostrando valor e quantidade por disciplina. Identifica onde está concentrado o valor do projeto.
            </p>
          </div>
          <div className="p-4 bg-white border-l-4 border-amber-400 rounded-r-xl shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900 mb-1">Categorias</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Visão semelhante ao de Disciplinas, mas segmentado por categoria de item (ex.: serviços, materiais, equipamentos).
            </p>
          </div>
          <div className="p-4 bg-white border-l-4 border-violet-400 rounded-r-xl shadow-sm">
            <h4 className="font-semibold text-sm text-gray-900 mb-1">Revisões</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Compare duas revisões e veja automaticamente: itens adicionados, removidos, alterados (com Δ quantidade e Δ valor) e sem alteração.
            </p>
          </div>
        </div>

        <SectionTitle>Seletor de revisão</SectionTitle>
        <p className="text-sm text-gray-600 mb-3">
          Quando há mais de uma revisão, um seletor aparece no topo da página de Análises. Trocar a revisão refaz todos os gráficos automaticamente.
        </p>

        <Tip type="success">
          <strong>Use o Pareto estrategicamente:</strong> os itens da classe A concentram 70% do valor. Foque sua negociação nesses itens para obter o maior impacto na redução de custos.
        </Tip>
      </div>
    ),
  },
  {
    id: 9,
    icon: Trophy,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    title: 'Baseline',
    subtitle: 'Histórico de premiações',
    content: (
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          O Baseline é o registro oficial das empresas vencedoras de cada contrato. Ele alimenta os KPIs do Dashboard e o gráfico de evolução temporal de valores.
        </p>

        <SectionTitle>Como registrar uma premiação</SectionTitle>
        <div className="space-y-1">
          <Step n={1} title="Acesse o Baseline">
            No menu lateral principal, clique em <strong>Baseline</strong> (ícone de troféu).
          </Step>
          <Step n={2} title="Localize a proposta vencedora">
            As propostas cadastradas no sistema são listadas agrupadas por projeto. Identifique a proposta da empresa vencedora.
          </Step>
          <Step n={3} title="Marque como premiada">
            Use a ação de premiação na linha da proposta, informando a <strong>data de premiação</strong> e confirmando o <strong>valor total</strong>.
          </Step>
          <Step n={4} title="O Dashboard é atualizado automaticamente">
            Ao voltar ao Dashboard, o projeto aparece com o valor premiado, alimentando os gráficos de timeline e o KPI de valor total equalizado.
          </Step>
        </div>

        <SectionTitle>O que o Baseline consolida</SectionTitle>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { icon: Award, title: 'Empresa vencedora', desc: 'Por projeto e proposta', color: 'yellow' },
            { icon: TrendingUp, title: 'Valor premiado', desc: 'Total do contrato', color: 'green' },
            { icon: Eye, title: 'Data de premiação', desc: 'Para análise temporal', color: 'blue' },
            { icon: Search, title: 'Histórico completo', desc: 'Todos os contratos', color: 'slate' },
          ].map((c) => <Card key={c.title} {...c} />)}
        </div>

        <Tip type="info">
          O Baseline é a única fonte de verdade para os valores no Dashboard. Projetos sem premiação registrada não aparecem nos KPIs e gráficos de valor.
        </Tip>
      </div>
    ),
  },
  {
    id: 10,
    icon: Lightbulb,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    title: 'Dicas Avançadas',
    subtitle: 'Boas práticas e fluxo ideal',
    content: (
      <div>
        <SectionTitle>Fluxo ideal de trabalho</SectionTitle>
        <div className="relative mb-8">
          {[
            { n: '1', label: 'Criar Projeto', sub: 'Nome, status, empresa' },
            { n: '2', label: 'Montar PQ', sub: 'Importar Excel ou inserir' },
            { n: '3', label: 'Criar Rev 0', sub: 'Snapshot inicial' },
            { n: '4', label: 'Receber Propostas', sub: 'Uma por fornecedor' },
            { n: '5', label: 'Equalizar', sub: 'Comparar item a item' },
            { n: '6', label: 'Analisar', sub: 'Pareto + Disciplinas' },
            { n: '7', label: 'Premiar', sub: 'Registrar no Baseline' },
          ].map((s, i, arr) => (
            <div key={s.n} className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{s.n}</div>
              <div className="flex-1 bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm">
                <span className="font-semibold text-sm text-gray-800">{s.label}</span>
                <span className="text-gray-400 text-xs ml-2">{s.sub}</span>
              </div>
              {i < arr.length - 1 && <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>

        <SectionTitle>Checklist antes de enviar para aprovação</SectionTitle>
        {[
          'PQ completo com disciplinas e categorias preenchidas',
          'Revisão criada antes de qualquer alteração de escopo',
          'Todas as propostas com 100% dos itens precificados',
          'Análise de Pareto executada e documentada',
          'Comparativo de revisões gerado (se houve mudança de escopo)',
          'Baseline atualizado com a empresa vencedora',
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-600">{item}</span>
          </div>
        ))}

        <SectionTitle>Perguntas frequentes</SectionTitle>
        <div className="space-y-3">
          {[
            {
              q: 'Posso ter múltiplas propostas por revisão?',
              a: 'Sim. Cada revisão pode ter quantas propostas forem necessárias, uma por fornecedor.',
            },
            {
              q: 'O que acontece se eu alterar o PQ após criar uma revisão?',
              a: 'Nada — as revisões são imutáveis. As alterações no PQ só afetam novas revisões criadas após as mudanças.',
            },
            {
              q: 'Posso importar o PQ de um arquivo SICRO?',
              a: 'Use a página SICRO no menu para consultar composições de custo e depois copiar os valores para o PQ.',
            },
            {
              q: 'Como exportar a equalização completa?',
              a: 'Em Análises, use o botão Exportar Excel. O arquivo inclui todos os fornecedores, preços e o total equalizado.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <p className="font-semibold text-sm text-gray-900 mb-1.5 flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold">?</span>
                {q}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed pl-7">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white text-center">
          <Zap size={24} className="mx-auto mb-3 text-yellow-300" />
          <h3 className="font-bold text-lg mb-2">Você concluiu o guia!</h3>
          <p className="text-blue-100 text-sm">Agora você tem todos os conhecimentos para usar o sistema com eficiência. Qualquer dúvida, consulte este material a qualquer momento.</p>
        </div>
      </div>
    ),
  },
]

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Help() {
  const [activeChapter, setActiveChapter] = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const contentRef = useRef<HTMLDivElement>(null)

  const chapter = chapters[activeChapter]
  const progress = Math.round(((activeChapter + 1) / chapters.length) * 100)

  function goTo(idx: number) {
    setCompleted((prev) => new Set([...prev, activeChapter]))
    setActiveChapter(idx)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function next() { if (activeChapter < chapters.length - 1) goTo(activeChapter + 1) }
  function prev() { if (activeChapter > 0) goTo(activeChapter - 1) }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <BookOpen size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Guia do Sistema</p>
              <p className="text-gray-400 text-xs">Equalização de Propostas</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 font-medium w-8 text-right">{progress}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{completed.size} de {chapters.length} capítulos concluídos</p>
        </div>

        {/* Chapter list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {chapters.map((ch, idx) => {
            const isActive = idx === activeChapter
            const isDone = completed.has(idx) && !isActive
            return (
              <button
                key={ch.id}
                onClick={() => goTo(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-blue-50 border border-blue-100'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                {/* Chapter icon or check */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone ? 'bg-green-100' : isActive ? ch.bg : 'bg-gray-100'
                }`}>
                  {isDone
                    ? <CheckCircle2 size={15} className="text-green-500" />
                    : <ch.icon size={15} className={isActive ? ch.color : 'text-gray-400'} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-700' : isDone ? 'text-gray-500' : 'text-gray-700'}`}>
                    {ch.title}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{ch.subtitle}</p>
                </div>
                {/* Chapter number */}
                <span className={`text-[10px] font-bold w-5 text-right flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-300'}`}>
                  {String(ch.id).padStart(2, '0')}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <span className="font-mono bg-gray-100 px-1 rounded">←</span>
            <span className="font-mono bg-gray-100 px-1 rounded">→</span>
            para navegar
          </p>
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${chapter.bg}`}>
              <chapter.icon size={14} className={chapter.color} />
            </div>
            <div>
              <span className="text-xs text-gray-400">Capítulo {chapter.id} de {chapters.length}</span>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">{chapter.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={activeChapter === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
            >
              <ChevronLeft size={13} /> Anterior
            </button>
            <button
              onClick={next}
              disabled={activeChapter === chapters.length - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
            >
              Próximo <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            {chapter.content}

            {/* Bottom navigation */}
            <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between">
              {activeChapter > 0 ? (
                <button onClick={prev} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  <ChevronLeft size={16} />
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 leading-none mb-0.5">Anterior</p>
                    <p className="font-medium leading-tight">{chapters[activeChapter - 1].title}</p>
                  </div>
                </button>
              ) : <div />}
              {activeChapter < chapters.length - 1 && (
                <button onClick={next} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  <div className="text-right">
                    <p className="text-[10px] text-blue-400 leading-none mb-0.5">Próximo capítulo</p>
                    <p className="font-medium leading-tight">{chapters[activeChapter + 1].title}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
