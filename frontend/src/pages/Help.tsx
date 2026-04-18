import React, { useState, useEffect } from 'react'
import {
  BookOpen, LayoutDashboard, FolderPlus, Table2, GitBranch,
  Building2, BarChart3, Trophy, Lightbulb, ChevronRight,
  ChevronLeft, CheckCircle2, Upload, Download, Plus,
  ArrowRight, Play, Star, Zap, Target, TrendingUp, FileSpreadsheet,
  Filter, Award, AlertCircle, Info,
} from 'lucide-react'

// ─── Tiny shared components ───────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{n}</div>
      <div>
        <p className="text-sm font-semibold text-gray-800 leading-snug">{title}</p>
        {children && <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{children}</p>}
      </div>
    </div>
  )
}

function Tip({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warn' | 'success' }) {
  const s = {
    info:    { box: 'bg-blue-50 border-blue-200',   icon: 'text-blue-500',  text: 'text-blue-800',  Icon: Info },
    warn:    { box: 'bg-amber-50 border-amber-200',  icon: 'text-amber-500', text: 'text-amber-800', Icon: AlertCircle },
    success: { box: 'bg-green-50 border-green-200',  icon: 'text-green-500', text: 'text-green-800', Icon: CheckCircle2 },
  }[type]
  return (
    <div className={`flex gap-2 p-3 rounded-lg border ${s.box}`}>
      <s.Icon size={14} className={`flex-shrink-0 mt-0.5 ${s.icon}`} />
      <p className={`text-xs leading-relaxed ${s.text}`}>{children}</p>
    </div>
  )
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{children}</p>
}

function MiniCard({ icon: Icon, title, desc, color = 'blue' }: { icon: React.ElementType; title: string; desc: string; color?: string }) {
  const c: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600', indigo: 'bg-indigo-50 text-indigo-600',
    slate: 'bg-slate-100 text-slate-600', teal: 'bg-teal-50 text-teal-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }
  return (
    <div className="flex gap-2.5 p-3 bg-white rounded-xl border border-gray-100 shadow-sm items-start">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c[color]}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="font-semibold text-gray-800 text-xs leading-tight">{title}</p>
        <p className="text-gray-500 text-[11px] mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  )
}

// ─── Chapter data ─────────────────────────────────────────────────────────────
interface Chapter {
  id: number
  icon: React.ElementType
  color: string
  bg: string
  title: string
  subtitle: string
  content: React.ReactNode
}

const chapters: Chapter[] = [
  // ── 1. Bem-vindo ─────────────────────────────────────────────────────────────
  {
    id: 1, icon: Play, color: 'text-blue-600', bg: 'bg-blue-100',
    title: 'Bem-vindo', subtitle: 'O que é e para quem é',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        {/* Left */}
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-1.5 text-blue-200 text-xs font-medium mb-2">
              <Star size={11} /> Software de Equalização de Propostas
            </div>
            <h2 className="text-lg font-bold mb-2 leading-tight">Plataforma completa para análise e equalização de licitações</h2>
            <p className="text-blue-100 text-xs leading-relaxed">
              Do quantitativo até a premiação — digital, rastreável e auditável.
            </p>
          </div>
          <div>
            <SLabel>O problema resolvido</SLabel>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">Sem o sistema</p>
                {['Excel descentralizado', 'Sem histórico de revisões', 'Difícil comparar fornecedores', 'Zero rastreabilidade'].map((t) => (
                  <p key={t} className="flex items-center gap-1.5 text-xs text-red-700 py-0.5"><span className="text-red-400 font-bold">✕</span>{t}</p>
                ))}
              </div>
              <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1.5">Com o sistema</p>
                {['Tudo centralizado', 'Revisões versionadas', 'Equalização lado a lado', 'Baseline completo'].map((t) => (
                  <p key={t} className="flex items-center gap-1.5 text-xs text-green-700 py-0.5"><CheckCircle2 size={11} className="text-green-500" />{t}</p>
                ))}
              </div>
            </div>
          </div>
          <Tip type="success">Este guia tem 10 capítulos. Use o menu lateral ou as teclas <strong>← →</strong> para navegar.</Tip>
        </div>
        {/* Right */}
        <div className="flex flex-col gap-3">
          <SLabel>Os 5 módulos principais</SLabel>
          <MiniCard icon={Table2} title="Planilha PQ" desc="Quantitativos: itens, unidades, quantidades e preço de referência." color="blue" />
          <MiniCard icon={GitBranch} title="Revisões" desc="Versiona o PQ. Cada revisão é um snapshot imutável e comparável." color="indigo" />
          <MiniCard icon={Building2} title="Propostas & Equalização" desc="Cadastre fornecedores e compare preços lado a lado por item." color="amber" />
          <MiniCard icon={BarChart3} title="Análises" desc="Curva ABC/Pareto, disciplinas, delta entre revisões e rankings." color="green" />
          <MiniCard icon={Trophy} title="Baseline" desc="Registra a empresa vencedora de cada contrato e valor premiado." color="purple" />
        </div>
      </div>
    ),
  },

  // ── 2. Dashboard ─────────────────────────────────────────────────────────────
  {
    id: 2, icon: LayoutDashboard, color: 'text-slate-600', bg: 'bg-slate-100',
    title: 'Dashboard', subtitle: 'Visão executiva do portfólio',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-4">
          <SLabel>O que você vai encontrar</SLabel>
          <div className="grid grid-cols-2 gap-2">
            <MiniCard icon={Target} title="KPIs do portfólio" desc="Total de projetos, em andamento, concluídos e valor total." color="blue" />
            <MiniCard icon={TrendingUp} title="Evolução temporal" desc="Gráfico de área com toggle semana / mês / ano." color="indigo" />
            <MiniCard icon={BarChart3} title="Top projetos" desc="Ranking dos projetos com maior valor premiado." color="green" />
            <MiniCard icon={FolderPlus} title="Projetos recentes" desc="Acesso rápido com valores por proposta vencedora." color="amber" />
          </div>
          <Tip type="info">
            Os valores do Dashboard vêm do Baseline (propostas premiadas). Se ainda não há premiação, os gráficos ficam em estado vazio.
          </Tip>
        </div>
        <div className="flex flex-col gap-4">
          <SLabel>Como navegar</SLabel>
          <div className="flex flex-col gap-3">
            <Step n={1} title="Acesse o Dashboard">Clique em Dashboard no menu lateral — é sempre a primeira opção.</Step>
            <Step n={2} title="Escolha o período">No gráfico de valores, use os botões Semana / Mês / Ano para alterar a granularidade.</Step>
            <Step n={3} title="Acesse projetos rapidamente">Em Projetos Recentes, passe o mouse sobre o card para revelar os atalhos: PQ, Equalização e Análises.</Step>
          </div>
        </div>
      </div>
    ),
  },

  // ── 3. Projetos ───────────────────────────────────────────────────────────────
  {
    id: 3, icon: FolderPlus, color: 'text-indigo-600', bg: 'bg-indigo-100',
    title: 'Projetos', subtitle: 'Criar e organizar licitações',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-4">
          <SLabel>Criando um projeto</SLabel>
          <div className="flex flex-col gap-3">
            <Step n={1} title="Vá até Projetos">Menu lateral → ícone de pasta → Projetos.</Step>
            <Step n={2} title="Clique em Novo Projeto">Botão azul no canto superior direito da listagem.</Step>
            <Step n={3} title="Preencha os dados">Nome, descrição, empresa contratante e status inicial.</Step>
            <Step n={4} title="Salve e acesse">O projeto aparece na lista. Clique para entrar e ver o menu Projeto Atual na sidebar.</Step>
          </div>
          <Tip type="warn">Ao excluir um projeto, <strong>todos os dados vinculados</strong> (PQ, propostas, revisões) são removidos permanentemente.</Tip>
        </div>
        <div className="flex flex-col gap-4">
          <SLabel>Campos do projeto</SLabel>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{['Campo', 'Exemplo', 'Req.'].map((h) => <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[['Nome', 'Reforma Sede 2025', '✓'], ['Descrição', 'Obras civis — escopo reduzido', '—'], ['Empresa', 'Construtora ABC', '—'], ['Status', 'Em andamento', '✓']].map(([c, e, r]) => (
                  <tr key={c} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{c}</td>
                    <td className="px-3 py-2 text-gray-400 font-mono text-[11px]">{e}</td>
                    <td className="px-3 py-2 text-center">{r === '✓' ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SLabel>Status disponíveis</SLabel>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'Em Andamento', c: 'bg-blue-50 text-blue-700 border-blue-100' }, { label: 'Concluído', c: 'bg-green-50 text-green-700 border-green-100' }, { label: 'Cancelado', c: 'bg-gray-50 text-gray-500 border-gray-100' }].map((s) => (
              <div key={s.label} className={`text-center p-2 rounded-xl border text-xs font-semibold ${s.c}`}>{s.label}</div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── 4. Planilha PQ ────────────────────────────────────────────────────────────
  {
    id: 4, icon: Table2, color: 'text-green-600', bg: 'bg-green-100',
    title: 'Planilha PQ', subtitle: 'Quantitativos do projeto',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-4">
          <SLabel>Estrutura de um item PQ</SLabel>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{['Campo', 'Exemplo', 'Req.'].map((h) => <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Código', 'EST-001', '✓'],
                  ['Descrição', 'Escavação mecânica em solo', '✓'],
                  ['Unidade', 'm³', '✓'],
                  ['Quantidade', '1.500,00', '✓'],
                  ['Preço Ref.', 'R$ 45,00', '—'],
                  ['Disciplina', 'Terraplenagem', '—'],
                  ['Categoria', 'Serviços', '—'],
                ].map(([c, e, r]) => (
                  <tr key={c} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{c}</td>
                    <td className="px-3 py-2 text-gray-400 font-mono text-[11px]">{e}</td>
                    <td className="px-3 py-2 text-center">{r === '✓' ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Tip type="info">Use Disciplina e Categoria consistentemente — eles alimentam os gráficos de Análises e permitem filtrar na Equalização.</Tip>
        </div>
        <div className="flex flex-col gap-3">
          <SLabel>Formas de inserir dados</SLabel>
          <div className="p-3 bg-white border border-blue-100 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center"><Plus size={12} className="text-blue-600" /></div>
              <span className="font-semibold text-sm text-gray-800">Inserção manual</span>
            </div>
            <p className="text-xs text-gray-500">Clique em <strong>+ Adicionar Item</strong> e preencha os campos na tabela. Ideal para projetos pequenos ou ajustes pontuais.</p>
          </div>
          <div className="p-3 bg-white border border-green-100 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center"><Upload size={12} className="text-green-600" /></div>
                <span className="font-semibold text-sm text-gray-800">Importar Excel</span>
              </div>
              <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">Recomendado</span>
            </div>
            <ol className="text-xs text-gray-500 space-y-0.5 list-decimal list-inside">
              <li>Clique em <strong>Baixar Template</strong> para obter o modelo</li>
              <li>Preencha a planilha com seus quantitativos</li>
              <li>Faça upload com <strong>Importar</strong></li>
            </ol>
          </div>
          <div className="p-3 bg-white border border-amber-100 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center"><Download size={12} className="text-amber-600" /></div>
              <span className="font-semibold text-sm text-gray-800">Exportar Excel</span>
            </div>
            <p className="text-xs text-gray-500">Baixe o PQ atual em .xlsx para compartilhar com a equipe ou auditar.</p>
          </div>
        </div>
      </div>
    ),
  },

  // ── 5. Revisões ──────────────────────────────────────────────────────────────
  {
    id: 5, icon: GitBranch, color: 'text-violet-600', bg: 'bg-violet-100',
    title: 'Revisões', subtitle: 'Versionamento do PQ',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-4">
          <SLabel>Como revisões funcionam</SLabel>
          <p className="text-xs text-gray-500 leading-relaxed">Revisões são <strong>snapshots imutáveis</strong> do PQ em um determinado momento. Permitem rastrear mudanças de escopo ao longo do processo licitatório.</p>
          <div className="flex items-center gap-2 py-2">
            {[{ label: 'Rev 0', desc: 'Inicial', c: 'bg-blue-600' }, { label: 'Rev 1', desc: 'Addendum', c: 'bg-violet-600' }, { label: 'Rev 2', desc: 'Retificação', c: 'bg-indigo-600' }].map((r, i, arr) => (
              <React.Fragment key={r.label}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full ${r.c} text-white flex items-center justify-center text-xs font-bold shadow`}>{r.label}</div>
                  <span className="text-[10px] text-gray-400">{r.desc}</span>
                </div>
                {i < arr.length - 1 && <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-200 to-violet-200 mt-3" />}
              </React.Fragment>
            ))}
          </div>
          <SLabel>Criando uma revisão</SLabel>
          <div className="flex flex-col gap-2">
            <Step n={1} title="Acesse Equalização do projeto" />
            <Step n={2} title="Clique em + Nova Revisão">O sistema sugere o próximo número automaticamente.</Step>
            <Step n={3} title="Defina número e descrição">Ex.: "Addendum 01 — inclusão de itens de drenagem"</Step>
            <Step n={4} title="Revisão criada com dados atuais do PQ">Alterações futuras no PQ não afetam revisões já criadas.</Step>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <SLabel>Comparando revisões em Análises</SLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Itens Adicionados', c: 'bg-green-50 text-green-700 border-green-200' },
              { label: 'Itens Removidos', c: 'bg-red-50 text-red-700 border-red-200' },
              { label: 'Itens Alterados', c: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'Sem Alteração', c: 'bg-gray-50 text-gray-500 border-gray-200' },
            ].map((b) => (
              <div key={b.label} className={`p-3 rounded-xl border text-center text-xs font-semibold ${b.c}`}>{b.label}</div>
            ))}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Na aba <strong>Revisões</strong> dentro de Análises, selecione duas revisões para ver automaticamente os deltas de quantidade e valor por item.
          </p>
          <Tip type="success">
            <strong>Boa prática:</strong> Crie uma revisão <em>antes</em> de fazer alterações significativas no PQ para garantir rastreabilidade completa.
          </Tip>
          <SLabel>Informações exibidas nos itens alterados</SLabel>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{['Coluna', 'O que mostra'].map((h) => <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[['Qtd A / Qtd B', 'Quantidade nas duas revisões'], ['Δ Qtd', 'Variação numérica de quantidade'], ['Valor A / B', 'Valor total calculado'], ['Δ Valor', 'Diferença de valor em R$'], ['Campos', 'Outros campos que mudaram']].map(([c, d]) => (
                  <tr key={c}><td className="px-3 py-1.5 font-mono text-[11px] text-gray-600">{c}</td><td className="px-3 py-1.5 text-gray-400">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),
  },

  // ── 6. Propostas ─────────────────────────────────────────────────────────────
  {
    id: 6, icon: FileSpreadsheet, color: 'text-amber-600', bg: 'bg-amber-100',
    title: 'Propostas', subtitle: 'Cadastrar fornecedores e preços',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-4">
          <SLabel>Criando uma proposta</SLabel>
          <div className="flex flex-col gap-2.5">
            <Step n={1} title="Vá para Equalização">Menu lateral → Projeto Atual → Equalização.</Step>
            <Step n={2} title="Escolha a revisão destino">As propostas são vinculadas a uma revisão específica.</Step>
            <Step n={3} title="Clique em + Nova Proposta">Dentro do painel da revisão correta.</Step>
            <Step n={4} title="Preencha os dados da proposta">Empresa, número/protocolo e data de recebimento.</Step>
          </div>
          <Tip type="warn">Se o PQ mudar e você criar uma nova revisão, será necessário criar novas propostas nessa revisão — as antigas ficam vinculadas à revisão original.</Tip>
        </div>
        <div className="flex flex-col gap-3">
          <SLabel>Inserindo preços</SLabel>
          <div className="p-3 bg-white border border-amber-100 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-gray-800">Template Excel</span>
              <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">Recomendado</span>
            </div>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Clique em <strong>Baixar Template</strong> da proposta</li>
              <li>O arquivo já vem com todos os itens do PQ</li>
              <li>Preencha a coluna <em>Preço Unitário</em></li>
              <li>Faça upload com <strong>Importar Excel</strong></li>
            </ol>
          </div>
          <div className="p-3 bg-white border border-gray-100 rounded-xl">
            <span className="font-semibold text-sm text-gray-800">Inserção manual</span>
            <p className="text-xs text-gray-500 mt-1">Clique sobre a proposta para expandir e edite os preços diretamente na tabela. Use Tab para navegar entre campos.</p>
          </div>
          <SLabel>Campos da proposta</SLabel>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {[['Empresa', 'Nome do licitante'], ['Nº / Protocolo', 'Referência da proposta'], ['Data', 'Data de recebimento']].map(([c, d]) => (
                  <tr key={c} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700 w-1/3">{c}</td>
                    <td className="px-3 py-2 text-gray-400">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),
  },

  // ── 7. Equalização ───────────────────────────────────────────────────────────
  {
    id: 7, icon: Building2, color: 'text-teal-600', bg: 'bg-teal-100',
    title: 'Equalização', subtitle: 'Comparar e selecionar propostas',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-4">
          <SLabel>Lendo a tabela de equalização</SLabel>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-3 py-2.5 text-left">Item</th>
                  <th className="px-3 py-2.5 text-right">Referência</th>
                  <th className="px-3 py-2.5 text-right text-green-300">Fornec. A</th>
                  <th className="px-3 py-2.5 text-right">Fornec. B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                <tr>
                  <td className="px-3 py-2 text-gray-700">EST-001</td>
                  <td className="px-3 py-2 text-right text-gray-400">R$ 67.500</td>
                  <td className="px-3 py-2 text-right font-bold text-green-600 bg-green-50">R$ 58.200</td>
                  <td className="px-3 py-2 text-right text-gray-400">R$ 72.000</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-700">DRE-001</td>
                  <td className="px-3 py-2 text-right text-gray-400">R$ 34.000</td>
                  <td className="px-3 py-2 text-right text-gray-400">R$ 38.500</td>
                  <td className="px-3 py-2 text-right font-bold text-green-600 bg-green-50">R$ 31.200</td>
                </tr>
              </tbody>
            </table>
            <div className="bg-gray-50 px-3 py-1.5 text-[10px] text-gray-400 flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Menor preço por item destacado em verde
            </div>
          </div>
          <Tip type="info">A equalização não premia automaticamente. O registro da empresa vencedora é feito manualmente no <strong>Baseline</strong> após a decisão.</Tip>
        </div>
        <div className="flex flex-col gap-4">
          <SLabel>Fluxo de trabalho</SLabel>
          <div className="flex flex-col gap-2.5">
            <Step n={1} title="Verifique que todas as propostas estão preenchidas">Confira se os preços foram importados corretamente para todos os itens.</Step>
            <Step n={2} title="Analise os totais por fornecedor">O cabeçalho de cada coluna exibe o valor total da proposta.</Step>
            <Step n={3} title="Use filtros por disciplina"><Filter size={11} className="inline" /> Segmente a visualização para analisar por disciplina ou categoria.</Step>
            <Step n={4} title="Exporte para referência">Gere um Excel com a equalização completa para apresentação interna.</Step>
          </div>
          <SLabel>Atalhos úteis</SLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Filter, label: 'Filtrar por disciplina', color: 'slate' },
              { icon: Download, label: 'Exportar equalização', color: 'green' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 p-2.5 bg-white border border-gray-100 rounded-lg">
                <div className={`w-6 h-6 rounded flex items-center justify-center bg-${color}-100`}>
                  <Icon size={12} className={`text-${color}-600`} />
                </div>
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── 8. Análises ───────────────────────────────────────────────────────────────
  {
    id: 8, icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-100',
    title: 'Análises', subtitle: 'Gráficos, Pareto e Revisões',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-3">
          <SLabel>As 4 abas de análise</SLabel>
          {[
            { border: 'border-blue-400', title: 'Curva ABC / Pareto', desc: 'Classifica itens por valor acumulado: A (70%), B (70–90%), C (acima de 90%). Total Geral aparece ao lado dos badges. Troque entre Referência e Propostas.' },
            { border: 'border-green-400', title: 'Disciplinas', desc: 'Gráfico de barras por disciplina. Identifica onde está concentrado o valor do projeto.' },
            { border: 'border-amber-400', title: 'Categorias', desc: 'Segmentação por categoria de item (serviços, materiais, equipamentos).' },
            { border: 'border-violet-400', title: 'Revisões', desc: 'Compare duas revisões e veja itens adicionados, removidos, alterados (com Δ qtd e Δ valor) e sem alteração.' },
          ].map((tab) => (
            <div key={tab.title} className={`p-3 bg-white border-l-4 ${tab.border} rounded-r-xl shadow-sm`}>
              <h4 className="font-semibold text-sm text-gray-900 mb-0.5">{tab.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{tab.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <SLabel>Seletor de revisão</SLabel>
          <p className="text-xs text-gray-500 leading-relaxed">
            Quando há mais de uma revisão, um seletor aparece no topo da página. Trocar a revisão <strong>refaz todos os gráficos</strong> automaticamente.
          </p>
          <Tip type="success">
            <strong>Estratégia Pareto:</strong> itens da classe A concentram 70% do valor. Foque a negociação nesses itens para o maior impacto na redução de custos.
          </Tip>
          <SLabel>Exportações disponíveis</SLabel>
          <div className="grid grid-cols-1 gap-2">
            <MiniCard icon={Download} title="Exportar Excel completo" desc="Todas as abas em um único arquivo .xlsx com tabelas e totais." color="green" />
          </div>
          <SLabel>Como acessar</SLabel>
          <div className="flex flex-col gap-2">
            <Step n={1} title="Menu lateral → Projeto Atual → Análises" />
            <Step n={2} title="Selecione a revisão desejada no seletor do topo" />
            <Step n={3} title="Clique na aba desejada: ABC, Disciplinas, Categorias ou Revisões" />
          </div>
        </div>
      </div>
    ),
  },

  // ── 9. Baseline ───────────────────────────────────────────────────────────────
  {
    id: 9, icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-100',
    title: 'Baseline', subtitle: 'Histórico de premiações',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-4">
          <SLabel>Como registrar uma premiação</SLabel>
          <div className="flex flex-col gap-2.5">
            <Step n={1} title="Acesse o Baseline">Menu lateral principal → ícone de troféu → Baseline.</Step>
            <Step n={2} title="Localize a proposta vencedora">Propostas listadas e agrupadas por projeto.</Step>
            <Step n={3} title="Marque como premiada">Informe data de premiação e confirme o valor total do contrato.</Step>
            <Step n={4} title="Dashboard atualizado automaticamente">O projeto aparece com valor premiado nos gráficos e KPIs.</Step>
          </div>
          <Tip type="info">O Baseline é a única fonte de verdade para os valores do Dashboard. Projetos sem premiação não aparecem nos KPIs e gráficos de valor.</Tip>
        </div>
        <div className="flex flex-col gap-3">
          <SLabel>O que o Baseline consolida</SLabel>
          <MiniCard icon={Award} title="Empresa vencedora" desc="Por projeto e proposta premiada." color="yellow" />
          <MiniCard icon={TrendingUp} title="Valor premiado" desc="Total do contrato fechado." color="green" />
          <MiniCard icon={BarChart3} title="Data de premiação" desc="Para alimentar a análise temporal do Dashboard." color="blue" />
          <MiniCard icon={Trophy} title="Histórico completo" desc="Todos os contratos premiados em uma visão única." color="slate" />
          <Tip type="success">
            Manter o Baseline atualizado garante que o Dashboard reflita o portfólio real de contratos da empresa.
          </Tip>
        </div>
      </div>
    ),
  },

  // ── 10. Dicas ────────────────────────────────────────────────────────────────
  {
    id: 10, icon: Lightbulb, color: 'text-orange-600', bg: 'bg-orange-100',
    title: 'Dicas Avançadas', subtitle: 'Fluxo ideal e boas práticas',
    content: (
      <div className="grid grid-cols-2 gap-5 h-full">
        <div className="flex flex-col gap-4">
          <SLabel>Fluxo ideal de trabalho</SLabel>
          <div className="flex flex-col gap-1.5">
            {[
              { n: '1', l: 'Criar Projeto', s: 'Nome, status, empresa' },
              { n: '2', l: 'Montar PQ', s: 'Importar Excel ou inserir' },
              { n: '3', l: 'Criar Rev 0', s: 'Snapshot inicial' },
              { n: '4', l: 'Receber Propostas', s: 'Uma por fornecedor' },
              { n: '5', l: 'Equalizar', s: 'Comparar item a item' },
              { n: '6', l: 'Analisar (Pareto)', s: 'Identificar itens críticos' },
              { n: '7', l: 'Premiar no Baseline', s: 'Registrar empresa vencedora' },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">{s.n}</div>
                <div className="flex-1 bg-white border border-gray-100 rounded-lg px-3 py-1.5 shadow-sm flex items-center justify-between">
                  <span className="font-semibold text-xs text-gray-800">{s.l}</span>
                  <span className="text-[10px] text-gray-400">{s.s}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <SLabel>Checklist de aprovação</SLabel>
          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            {[
              'PQ completo com disciplinas e categorias preenchidas',
              'Revisão criada antes de qualquer mudança de escopo',
              'Todas as propostas com 100% dos itens precificados',
              'Análise Pareto executada',
              'Comparativo de revisões gerado (se houve mudança)',
              'Baseline atualizado com a empresa vencedora',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                <span className="text-xs text-gray-600">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white text-center">
            <Zap size={20} className="mx-auto mb-2 text-yellow-300" />
            <h3 className="font-bold text-sm mb-1">Guia concluído!</h3>
            <p className="text-blue-100 text-xs">Você tem todos os conhecimentos para usar o sistema com eficiência. Este material está sempre disponível no menu lateral.</p>
          </div>
        </div>
      </div>
    ),
  },
]

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Help() {
  const [active, setActive] = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  const chapter = chapters[active]

  function goTo(idx: number) {
    setCompleted((prev) => new Set([...prev, active]))
    setActive(idx)
  }
  function next() { if (active < chapters.length - 1) goTo(active + 1) }
  function prev() { if (active > 0) goTo(active - 1) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const progress = Math.round(((active + 1) / chapters.length) * 100)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Sidebar ────────────────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <BookOpen size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Guia do Sistema</p>
              <p className="text-gray-400 text-[11px]">10 capítulos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-400 font-medium">{progress}%</span>
          </div>
        </div>

        {/* Chapter list */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {chapters.map((ch, idx) => {
            const isActive = idx === active
            const isDone = completed.has(idx) && !isActive
            return (
              <button
                key={ch.id}
                onClick={() => goTo(idx)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                  isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone ? 'bg-green-100' : isActive ? ch.bg : 'bg-gray-100'
                }`}>
                  {isDone
                    ? <CheckCircle2 size={14} className="text-green-500" />
                    : <ch.icon size={14} className={isActive ? ch.color : 'text-gray-400'} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-700' : isDone ? 'text-gray-400' : 'text-gray-700'}`}>{ch.title}</p>
                  <p className="text-[10px] text-gray-400 truncate">{ch.subtitle}</p>
                </div>
                <span className={`text-[10px] font-bold flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-200'}`}>{String(ch.id).padStart(2, '0')}</span>
              </button>
            )
          })}
        </nav>

        {/* Keyboard hint */}
        <div className="px-4 py-2.5 border-t border-gray-100 flex-shrink-0">
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">←</span>
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">→</span>
            para navegar entre capítulos
          </p>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${chapter.bg}`}>
              <chapter.icon size={14} className={chapter.color} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 leading-none">Capítulo {chapter.id} de {chapters.length}</p>
              <h1 className="font-bold text-gray-900 text-sm leading-snug">{chapter.title} — <span className="font-normal text-gray-500">{chapter.subtitle}</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prev} disabled={active === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all">
              <ChevronLeft size={13} /> Anterior
            </button>
            {active < chapters.length - 1 ? (
              <button onClick={next}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all">
                {chapters[active + 1].title} <ArrowRight size={13} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg">
                <CheckCircle2 size={13} /> Concluído
              </div>
            )}
          </div>
        </div>

        {/* Chapter content — no scroll */}
        <div className="flex-1 overflow-hidden p-5">
          {chapter.content}
        </div>
      </div>
    </div>
  )
}
