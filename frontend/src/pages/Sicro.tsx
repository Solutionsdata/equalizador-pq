import React, { useState } from 'react'
import { ExternalLink, Download, ChevronDown, ChevronRight, MapPin, Calendar, FileArchive, Info, Database, Building2 } from 'lucide-react'

// ── Tipos compartilhados ───────────────────────────────────────────────────────

type SystemTab = 'sicro' | 'sinapi' | 'der-mg' | 'der-pr'

// ── Constantes SICRO / DNIT ───────────────────────────────────────────────────

const BASE_SICRO = 'https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro/relatorios/relatorios-sicro'

const MONTH_NUM: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

interface Periodo {
  label: string
  slug: string
  mes: string
  revisado?: boolean
}

interface AnoData {
  ano: number
  periodos: Periodo[]
}

const ANOS: AnoData[] = [
  {
    ano: 2026,
    periodos: [
      { label: 'Janeiro', slug: 'janeiro', mes: 'janeiro' },
    ],
  },
  {
    ano: 2025,
    periodos: [
      { label: 'Janeiro',          slug: 'janeiro',         mes: 'janeiro' },
      { label: 'Abril',            slug: 'abril',           mes: 'abril' },
      { label: 'Abril (Revisado)', slug: 'abril-revisado',  mes: 'abril', revisado: true },
      { label: 'Julho',            slug: 'julho',           mes: 'julho' },
      { label: 'Outubro',          slug: 'outubro',         mes: 'outubro' },
      { label: 'Outubro (Revisado)', slug: 'outubro-revisado', mes: 'outubro', revisado: true },
    ],
  },
  {
    ano: 2024,
    periodos: [
      { label: 'Janeiro', slug: 'janeiro', mes: 'janeiro' },
      { label: 'Abril',   slug: 'abril',   mes: 'abril' },
      { label: 'Julho',   slug: 'julho',   mes: 'julho' },
      { label: 'Outubro', slug: 'outubro', mes: 'outubro' },
    ],
  },
  {
    ano: 2023,
    periodos: [
      { label: 'Janeiro', slug: 'janeiro', mes: 'janeiro' },
      { label: 'Abril',   slug: 'abril',   mes: 'abril' },
      { label: 'Julho',   slug: 'julho',   mes: 'julho' },
      { label: 'Outubro', slug: 'outubro', mes: 'outubro' },
    ],
  },
  {
    ano: 2022,
    periodos: [
      { label: 'Janeiro',            slug: 'janeiro',          mes: 'janeiro' },
      { label: 'Abril',              slug: 'abril',            mes: 'abril' },
      { label: 'Julho',              slug: 'julho',            mes: 'julho' },
      { label: 'Outubro',            slug: 'outubro',          mes: 'outubro' },
      { label: 'Outubro (Revisado)', slug: 'outubro-revisado', mes: 'outubro', revisado: true },
    ],
  },
  {
    ano: 2021,
    periodos: [
      { label: 'Janeiro', slug: 'janeiro', mes: 'janeiro' },
      { label: 'Abril',   slug: 'abril',   mes: 'abril' },
      { label: 'Julho',   slug: 'julho',   mes: 'julho' },
      { label: 'Outubro', slug: 'outubro', mes: 'outubro' },
    ],
  },
  {
    ano: 2020,
    periodos: [
      { label: 'Janeiro', slug: 'janeiro', mes: 'janeiro' },
      { label: 'Abril',   slug: 'abril',   mes: 'abril' },
      { label: 'Julho',   slug: 'julho',   mes: 'julho' },
      { label: 'Outubro', slug: 'outubro', mes: 'outubro' },
    ],
  },
  {
    ano: 2019,
    periodos: [
      { label: 'Janeiro', slug: 'janeiro', mes: 'janeiro' },
      { label: 'Abril',   slug: 'abril',   mes: 'abril' },
      { label: 'Julho',   slug: 'julho',   mes: 'julho' },
      { label: 'Outubro', slug: 'outubro', mes: 'outubro' },
    ],
  },
  {
    ano: 2018,
    periodos: [
      { label: 'Janeiro',          slug: 'janeiro',        mes: 'janeiro' },
      { label: 'Março',            slug: 'marco',          mes: 'março' },
      { label: 'Maio',             slug: 'maio',           mes: 'maio' },
      { label: 'Julho',            slug: 'julho',          mes: 'julho' },
      { label: 'Julho (Revisado)', slug: 'julho-revisado', mes: 'julho', revisado: true },
      { label: 'Outubro',          slug: 'outubro',        mes: 'outubro' },
    ],
  },
  {
    ano: 2017,
    periodos: [
      { label: 'Janeiro',   slug: 'janeiro',   mes: 'janeiro' },
      { label: 'Março',     slug: 'marco',     mes: 'março' },
      { label: 'Maio',      slug: 'maio',      mes: 'maio' },
      { label: 'Julho',     slug: 'julho',     mes: 'julho' },
      { label: 'Setembro',  slug: 'setembro',  mes: 'setembro' },
      { label: 'Novembro',  slug: 'novembro',  mes: 'novembro' },
    ],
  },
]

interface Estado {
  sigla: string
  nome: string
  regiao: string
  regiaoSlug: string
  stateSlug: string
  filePrefix: string
  accentColor: string
  bgColor: string
  textColor: string
  pagina: string
}

const ESTADOS: Estado[] = [
  {
    sigla: 'PR',
    nome: 'Paraná',
    regiao: 'Sul',
    regiaoSlug: 'sul',
    stateSlug: 'parana',
    filePrefix: 'pr',
    accentColor: '#1B7C3E',
    bgColor: '#E8F5EE',
    textColor: '#145C2E',
    pagina: `${BASE_SICRO}/sul/parana`,
  },
  {
    sigla: 'MG',
    nome: 'Minas Gerais',
    regiao: 'Sudeste',
    regiaoSlug: 'sudeste',
    stateSlug: 'minas-gerais',
    filePrefix: 'mg',
    accentColor: '#F5A623',
    bgColor: '#FEF3DC',
    textColor: '#8B5E0A',
    pagina: `${BASE_SICRO}/sudeste/minas-gerais`,
  },
]

function getPaginaUrl(estado: Estado, ano: number, slug: string): string {
  return `${BASE_SICRO}/${estado.regiaoSlug}/${estado.stateSlug}/${ano}/${slug}/${slug}-${ano}`
}

function getDownloadUrl(estado: Estado, ano: number, p: Periodo): string | null {
  if (p.revisado) return null
  const mesNum = MONTH_NUM[p.mes]
  if (!mesNum) return null
  return `${BASE_SICRO}/${estado.regiaoSlug}/${estado.stateSlug}/${ano}/${p.slug}/${estado.filePrefix}-${mesNum}-${ano}.7z`
}

// ── SICRO tab ─────────────────────────────────────────────────────────────────

function TabSicro() {
  const [activeState, setActiveState] = useState<string>('PR')
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([2026, 2025]))

  const estado = ESTADOS.find((e) => e.sigla === activeState)!

  function toggleYear(ano: number) {
    setExpandedYears((prev) => {
      const next = new Set(prev)
      if (next.has(ano)) next.delete(ano)
      else next.add(ano)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl p-4 text-sm" style={{ background: '#E8EDF6', border: '1px solid #1A3A6B' }}>
        <Info size={16} style={{ color: '#1A3A6B', flexShrink: 0, marginTop: 2 }} />
        <div style={{ color: '#1A3A6B' }}>
          <span className="font-semibold">Arquivos .7z</span> — Os relatórios DNIT são comprimidos em formato 7-Zip.
          Instale o <a href="https://www.7-zip.org" target="_blank" rel="noopener noreferrer" className="underline font-medium">7-Zip gratuito</a> para extrair.
          Cada pacote contém planilhas Excel com preços de insumos e composições por estado.
        </div>
      </div>

      {/* Seletor de estado */}
      <div className="grid grid-cols-2 gap-4">
        {ESTADOS.map((e) => (
          <button
            key={e.sigla}
            onClick={() => setActiveState(e.sigla)}
            className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              activeState === e.sigla ? '' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
            style={activeState === e.sigla ? { background: e.bgColor, borderColor: e.accentColor } : {}}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
              style={{ background: activeState === e.sigla ? e.bgColor : '#F3F4F6' }}>
              <span style={{ color: activeState === e.sigla ? e.accentColor : '#6B7280', fontWeight: 900 }}>{e.sigla}</span>
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: activeState === e.sigla ? e.accentColor : '#1F2937' }}>
                {e.nome}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <MapPin size={10} />
                Região {e.regiao}
              </p>
            </div>
            {activeState === e.sigla && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: e.accentColor }} />
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo do estado selecionado */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: estado.bgColor }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: estado.accentColor }}>
              Relatórios SICRO — {estado.nome} ({estado.sigla})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Clique no período para abrir no DNIT · Botão ↓ baixa o arquivo .7z direto
            </p>
          </div>
          <a
            href={estado.pagina}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80"
            style={{ background: estado.bgColor, color: estado.accentColor, borderColor: estado.accentColor }}
          >
            <ExternalLink size={12} />
            Ver página oficial DNIT
          </a>
        </div>

        <div className="divide-y divide-gray-100">
          {ANOS.map(({ ano, periodos }) => {
            const isExpanded = expandedYears.has(ano)
            const isLatest = ano === 2026

            return (
              <div key={ano}>
                <button
                  onClick={() => toggleYear(ano)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={15} className="text-gray-400" />
                    <span className="font-semibold text-gray-900 text-sm">{ano}</span>
                    {isLatest && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E8F5EE', color: '#1B7C3E' }}>
                        Mais recente
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {periodos.length} período{periodos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {isExpanded
                    ? <ChevronDown size={16} className="text-gray-400" />
                    : <ChevronRight size={16} className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {periodos.map((p) => {
                        const pageUrl = getPaginaUrl(estado, ano, p.slug)
                        const dlUrl = getDownloadUrl(estado, ano, p)

                        return (
                          <div
                            key={p.slug}
                            className="flex items-center gap-0 rounded-lg border overflow-hidden text-xs font-medium"
                            style={{ borderColor: p.revisado ? '#C084FC' : '#E5E7EB' }}
                          >
                            <a
                              href={pageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-2 transition-colors"
                              style={p.revisado ? { background: '#FAF5FF', color: '#7C3AED' } : { background: 'white', color: '#374151' }}
                              title={`Abrir ${p.label} ${ano} no DNIT`}
                            >
                              <ExternalLink size={11} />
                              {p.label}
                            </a>
                            {dlUrl && (
                              <a
                                href={dlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-2 bg-gray-100 text-gray-600 transition-colors border-l border-gray-200"
                                style={{}}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = estado.bgColor; (e.currentTarget as HTMLElement).style.color = estado.accentColor }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = '' }}
                                title={`Baixar ${estado.filePrefix}-${MONTH_NUM[p.mes]}-${ano}.7z`}
                              >
                                <Download size={11} />
                                <span className="text-[10px]">.7z</span>
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {periodos.filter((p) => !p.revisado).map((p) => {
                        const mesNum = MONTH_NUM[p.mes]
                        const filename = `${estado.filePrefix}-${mesNum}-${ano}.7z`
                        return (
                          <span key={p.slug} className="flex items-center gap-1 text-[10px] text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
                            <FileArchive size={9} />
                            {filename}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <ExternalLink size={11} className="text-blue-500" />
          Abre a página do período no site do DNIT
        </span>
        <span className="flex items-center gap-1.5">
          <Download size={11} style={{ color: '#1B7C3E' }} />
          Download direto do arquivo .7z
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-100 border border-purple-200 inline-block" />
          Versão revisada — acesse a página para baixar
        </span>
      </div>
    </div>
  )
}

// ── Dados SINAPI ──────────────────────────────────────────────────────────────

const BASE_SINAPI = 'https://www.caixa.gov.br/poder-publico/programas-uniao/habitacao/sinapi/Paginas'

interface SinapiEstado {
  sigla: string
  nome: string
  urlDesonerado: string
  urlNaoDesonerado: string
}

const SINAPI_ESTADOS: SinapiEstado[] = [
  {
    sigla: 'PR',
    nome: 'Paraná',
    urlDesonerado: `${BASE_SINAPI}/relatorio-de-insumos-e-composicoes.aspx`,
    urlNaoDesonerado: `${BASE_SINAPI}/relatorio-de-insumos-e-composicoes.aspx`,
  },
  {
    sigla: 'MG',
    nome: 'Minas Gerais',
    urlDesonerado: `${BASE_SINAPI}/relatorio-de-insumos-e-composicoes.aspx`,
    urlNaoDesonerado: `${BASE_SINAPI}/relatorio-de-insumos-e-composicoes.aspx`,
  },
]

function TabSinapi() {
  return (
    <div className="space-y-6">
      {/* Header informativo */}
      <div className="flex items-start gap-3 rounded-xl p-4 text-sm" style={{ background: '#E8F5EE', border: '1px solid #1B7C3E' }}>
        <Info size={16} style={{ color: '#1B7C3E', flexShrink: 0, marginTop: 2 }} />
        <div style={{ color: '#145C2E' }}>
          <p className="font-semibold mb-1">SINAPI — Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil</p>
          <p>
            Gerenciado pela <strong>Caixa Econômica Federal</strong> em parceria com o IBGE.
            Fornece preços de referência para obras de engenharia civil — amplamente exigido em licitações federais e estaduais.
            Os relatórios são divulgados mensalmente com e sem desoneração da folha de pagamento.
          </p>
        </div>
      </div>

      {/* Acesso principal */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ background: '#E8F5EE' }}>
          <h2 className="font-bold text-base" style={{ color: '#1B7C3E' }}>Portal SINAPI — Caixa Econômica Federal</h2>
          <p className="text-xs text-gray-500 mt-0.5">Relatórios mensais de insumos e composições por estado</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Links rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="https://www.caixa.gov.br/poder-publico/programas-uniao/habitacao/sinapi/Paginas/default.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm"
              style={{ border: '1px solid #1B7C3E', background: '#FAFFFE' }}
            >
              <Database size={20} style={{ color: '#1B7C3E', flexShrink: 0 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: '#145C2E' }}>Portal SINAPI Principal</p>
                <p className="text-xs text-gray-500 mt-0.5">caixa.gov.br — Página oficial</p>
              </div>
              <ExternalLink size={14} className="text-gray-400 ml-auto flex-shrink-0" />
            </a>

            <a
              href="https://www.caixa.gov.br/poder-publico/programas-uniao/habitacao/sinapi/Paginas/relatorio-de-insumos-e-composicoes.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm"
              style={{ border: '1px solid #1A3A6B', background: '#F8FAFF' }}
            >
              <Download size={20} style={{ color: '#1A3A6B', flexShrink: 0 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: '#1A3A6B' }}>Relatórios por Estado</p>
                <p className="text-xs text-gray-500 mt-0.5">Insumos e composições — todos os estados</p>
              </div>
              <ExternalLink size={14} className="text-gray-400 ml-auto flex-shrink-0" />
            </a>
          </div>

          {/* Guia de uso */}
          <div className="rounded-xl p-4 text-sm space-y-3" style={{ background: '#F0F2F5' }}>
            <p className="font-semibold text-gray-700">Como acessar os relatórios por estado:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-600 text-xs">
              <li>Acesse o <strong>Portal SINAPI</strong> ou o link de Relatórios por Estado acima</li>
              <li>Na página de relatórios, selecione o <strong>Estado</strong> (Paraná ou Minas Gerais)</li>
              <li>Escolha o <strong>mês de referência</strong> desejado</li>
              <li>Baixe a planilha <strong>com desoneração</strong> (obras financiadas pela União) ou <strong>sem desoneração</strong> conforme o contrato</li>
            </ol>
          </div>

          {/* Diferença desonerado/não desonerado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: '#E8F5EE', border: '1px solid #1B7C3E' }}>
              <p className="font-semibold" style={{ color: '#145C2E' }}>Com desoneração</p>
              <p className="text-gray-600">Tabela aplicada quando há desoneração da folha de pagamento (Lei nº 12.546/2011). Utilizada em contratos federais.</p>
            </div>
            <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: '#E8EDF6', border: '1px solid #1A3A6B' }}>
              <p className="font-semibold" style={{ color: '#1A3A6B' }}>Sem desoneração</p>
              <p className="text-gray-600">Tabela padrão, sem benefício da desoneração. Mais comum em contratos estaduais e municipais.</p>
            </div>
          </div>

          {/* Estados de interesse */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Estados de interesse — Acesso direto</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { sigla: 'PR', nome: 'Paraná', regiao: 'Sul' },
                { sigla: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
              ].map((e) => (
                <a
                  key={e.sigla}
                  href="https://www.caixa.gov.br/poder-publico/programas-uniao/habitacao/sinapi/Paginas/relatorio-de-insumos-e-composicoes.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: '#F0F2F5', color: '#1A3A6B' }}>
                    {e.sigla}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{e.nome}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <MapPin size={9} /> Região {e.regiao}
                    </p>
                  </div>
                  <ExternalLink size={13} className="text-gray-400 ml-auto" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Frequência de atualização */}
      <div className="flex items-center gap-3 text-xs text-gray-500 px-1">
        <Calendar size={13} className="text-gray-400" />
        SINAPI é divulgado mensalmente pela Caixa Econômica Federal — acesse o portal para a versão mais recente.
      </div>
    </div>
  )
}

// ── DER — Dados compartilhados ─────────────────────────────────────────────────

interface DerTabelaItem {
  titulo: string
  descricao: string
  url: string
  tipo: 'composicoes' | 'insumos' | 'tabela' | 'manual'
}

// ── DER MG tab ─────────────────────────────────────────────────────────────────

const DER_MG_LINKS: DerTabelaItem[] = [
  {
    titulo: 'Tabela de Custos Unitários — DER-MG',
    descricao: 'Composições de custos unitários para serviços rodoviários em Minas Gerais',
    url: 'https://www.der.mg.gov.br/noticias/tabela-de-custos',
    tipo: 'tabela',
  },
  {
    titulo: 'Portal DER-MG — Engenharia',
    descricao: 'Acesso central às tabelas e normas de engenharia do DER Minas Gerais',
    url: 'https://www.der.mg.gov.br/engenharia',
    tipo: 'composicoes',
  },
  {
    titulo: 'Publicações e Normas DER-MG',
    descricao: 'Manuais técnicos, normas e especificações para obras rodoviárias em MG',
    url: 'https://www.der.mg.gov.br/publicacoes',
    tipo: 'manual',
  },
]

function TabDerMG() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl p-4 text-sm" style={{ background: '#FEF3DC', border: '1px solid #F5A623' }}>
        <Info size={16} style={{ color: '#F5A623', flexShrink: 0, marginTop: 2 }} />
        <div style={{ color: '#8B5E0A' }}>
          <p className="font-semibold mb-1">DER-MG — Departamento de Estradas de Rodagem de Minas Gerais</p>
          <p>
            O DER-MG publica tabelas de custos unitários para obras e serviços rodoviários no estado de Minas Gerais.
            Estas tabelas são amplamente utilizadas como referência em licitações estaduais de infraestrutura viária em MG.
          </p>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ background: '#FEF3DC' }}>
          <h2 className="font-bold text-base" style={{ color: '#8B5E0A' }}>
            Tabelas DER-MG — Minas Gerais
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Custos unitários para obras rodoviárias · Acesso ao portal oficial</p>
        </div>

        <div className="p-5 space-y-3">
          {/* Link principal */}
          <a
            href="https://www.der.mg.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm"
            style={{ border: '1px solid #F5A623', background: '#FFFDF8' }}
          >
            <Building2 size={24} style={{ color: '#F5A623', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: '#8B5E0A' }}>Portal Oficial DER-MG</p>
              <p className="text-xs text-gray-500 mt-0.5">der.mg.gov.br — Departamento de Estradas de Rodagem de Minas Gerais</p>
            </div>
            <ExternalLink size={16} className="text-gray-400 flex-shrink-0" />
          </a>

          {/* Links específicos */}
          <div className="space-y-2">
            {DER_MG_LINKS.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3DC' }}>
                  {item.tipo === 'tabela' && <Database size={15} style={{ color: '#F5A623' }} />}
                  {item.tipo === 'composicoes' && <BarChartIcon size={15} style={{ color: '#F5A623' }} />}
                  {item.tipo === 'manual' && <FileArchive size={15} style={{ color: '#F5A623' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{item.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.descricao}</p>
                </div>
                <ExternalLink size={13} className="text-gray-400 flex-shrink-0" />
              </a>
            ))}
          </div>

          {/* Guia */}
          <div className="rounded-xl p-4 text-xs space-y-2" style={{ background: '#F0F2F5' }}>
            <p className="font-semibold text-gray-700">Informações sobre as tabelas DER-MG:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>As tabelas são atualizadas periodicamente conforme índices de reajuste</li>
              <li>Contemplam composições para pavimentação, terraplenagem, obras de arte e drenagem</li>
              <li>Para obras estaduais em MG, consultar sempre a versão mais recente no portal</li>
              <li>Em caso de divergência, prevalece o publicado no Diário Oficial do Estado</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── DER PR tab ─────────────────────────────────────────────────────────────────

const DER_PR_LINKS: DerTabelaItem[] = [
  {
    titulo: 'Tabelas de Composições — DER-PR',
    descricao: 'Composições de serviços e custos unitários para obras rodoviárias no Paraná',
    url: 'https://www.der.pr.gov.br/Pagina/Tabelas-de-composicoes-de-servicos-e-custos-unitarios',
    tipo: 'composicoes',
  },
  {
    titulo: 'Tabela de Insumos — DER-PR',
    descricao: 'Preços de insumos de referência para serviços rodoviários no Paraná',
    url: 'https://www.der.pr.gov.br/Pagina/Tabelas-de-composicoes-de-servicos-e-custos-unitarios',
    tipo: 'insumos',
  },
  {
    titulo: 'Portal DER-PR — Engenharia',
    descricao: 'Acesso central às normas, especificações e tabelas técnicas do DER Paraná',
    url: 'https://www.der.pr.gov.br',
    tipo: 'tabela',
  },
]

function TabDerPR() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl p-4 text-sm" style={{ background: '#E8EDF6', border: '1px solid #1A3A6B' }}>
        <Info size={16} style={{ color: '#1A3A6B', flexShrink: 0, marginTop: 2 }} />
        <div style={{ color: '#1A3A6B' }}>
          <p className="font-semibold mb-1">DER-PR — Departamento de Estradas de Rodagem do Paraná</p>
          <p>
            O DER-PR mantém tabelas de custos para obras e serviços rodoviários no estado do Paraná.
            São referência obrigatória em processos licitatórios de infraestrutura viária estadual no PR.
          </p>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ background: '#E8EDF6' }}>
          <h2 className="font-bold text-base" style={{ color: '#1A3A6B' }}>
            Tabelas DER-PR — Paraná
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Custos unitários para obras rodoviárias · Acesso ao portal oficial</p>
        </div>

        <div className="p-5 space-y-3">
          {/* Link principal */}
          <a
            href="https://www.der.pr.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm"
            style={{ border: '1px solid #1A3A6B', background: '#F8FAFF' }}
          >
            <Building2 size={24} style={{ color: '#1A3A6B', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: '#1A3A6B' }}>Portal Oficial DER-PR</p>
              <p className="text-xs text-gray-500 mt-0.5">der.pr.gov.br — Departamento de Estradas de Rodagem do Paraná</p>
            </div>
            <ExternalLink size={16} className="text-gray-400 flex-shrink-0" />
          </a>

          {/* Links específicos */}
          <div className="space-y-2">
            {DER_PR_LINKS.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#E8EDF6' }}>
                  {item.tipo === 'tabela' && <Database size={15} style={{ color: '#1A3A6B' }} />}
                  {item.tipo === 'composicoes' && <BarChartIcon size={15} style={{ color: '#1A3A6B' }} />}
                  {item.tipo === 'insumos' && <FileArchive size={15} style={{ color: '#1A3A6B' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{item.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.descricao}</p>
                </div>
                <ExternalLink size={13} className="text-gray-400 flex-shrink-0" />
              </a>
            ))}
          </div>

          {/* Guia */}
          <div className="rounded-xl p-4 text-xs space-y-2" style={{ background: '#F0F2F5' }}>
            <p className="font-semibold text-gray-700">Informações sobre as tabelas DER-PR:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Tabelas atualizadas trimestralmente ou conforme publicação de novos índices</li>
              <li>Incluem composições de pavimentação asfáltica, concreto, terraplenagem e obras de arte</li>
              <li>Para licitações estaduais no PR, verificar sempre a tabela vigente na data do orçamento</li>
              <li>Complementar ao SICRO/DNIT para serviços rodoviários com características regionais</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Ícone auxiliar (BarChart não existe no lucide com esse nome)
function BarChartIcon({ size, style }: { size: number; style?: React.CSSProperties }) {
  return <Database size={size} style={style} />
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function Sicro() {
  const [activeSystem, setActiveSystem] = useState<SystemTab>('sicro')

  const systems: { id: SystemTab; label: string; sublabel: string; accent: string; bg: string }[] = [
    { id: 'sicro',  label: 'SICRO',  sublabel: 'DNIT',  accent: '#1A3A6B', bg: '#E8EDF6' },
    { id: 'sinapi', label: 'SINAPI', sublabel: 'Caixa', accent: '#1B7C3E', bg: '#E8F5EE' },
    { id: 'der-mg', label: 'DER-MG', sublabel: 'Minas Gerais', accent: '#F5A623', bg: '#FEF3DC' },
    { id: 'der-pr', label: 'DER-PR', sublabel: 'Paraná', accent: '#1A3A6B', bg: '#E8EDF6' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tabelas de Referência de Preços</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          SICRO · SINAPI · DER-MG · DER-PR — Fontes oficiais de custos para obras de infraestrutura
        </p>
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {systems.map((sys) => (
          <button
            key={sys.id}
            onClick={() => setActiveSystem(sys.id)}
            className="relative flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all text-center"
            style={activeSystem === sys.id
              ? { background: sys.bg, borderColor: sys.accent }
              : { background: 'white', borderColor: '#E5E7EB' }
            }
          >
            <span className="text-lg font-black" style={{ color: activeSystem === sys.id ? sys.accent : '#374151' }}>
              {sys.label}
            </span>
            <span className="text-[10px] font-medium" style={{ color: activeSystem === sys.id ? sys.accent : '#9CA3AF', opacity: activeSystem === sys.id ? 0.8 : 1 }}>
              {sys.sublabel}
            </span>
            {activeSystem === sys.id && (
              <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full" style={{ background: sys.accent }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSystem === 'sicro'  && <TabSicro />}
      {activeSystem === 'sinapi' && <TabSinapi />}
      {activeSystem === 'der-mg' && <TabDerMG />}
      {activeSystem === 'der-pr' && <TabDerPR />}
    </div>
  )
}

// ── Export de dados para o Dashboard ─────────────────────────────────────────

export { ESTADOS, ANOS, getPaginaUrl, getDownloadUrl }
