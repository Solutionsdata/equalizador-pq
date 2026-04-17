import React, { useState } from 'react'
import { ExternalLink, Download, ChevronDown, ChevronRight, MapPin, Calendar, FileArchive, Info } from 'lucide-react'

// ── Constantes DNIT ───────────────────────────────────────────────────────────

const BASE = 'https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-referenciais/sistemas-de-custos/sicro/relatorios/relatorios-sicro'

const MONTH_NUM: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

interface Periodo {
  label: string    // ex: "Janeiro", "Abril (Revisado)"
  slug: string     // ex: "janeiro", "abril-revisado"
  mes: string      // ex: "janeiro"
  revisado?: boolean
}

interface AnoData {
  ano: number
  periodos: Periodo[]
}

// Disponibilidade confirmada no DNIT (Sul e Sudeste têm os mesmos períodos)
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

// ── Estados ────────────────────────────────────────────────────────────────────

interface Estado {
  sigla: string
  nome: string
  regiao: string
  regiaoSlug: string
  stateSlug: string
  filePrefix: string
  cor: string
  corBg: string
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
    cor: 'text-emerald-700',
    corBg: 'bg-emerald-50 border-emerald-200',
    pagina: `${BASE}/sul/parana`,
  },
  {
    sigla: 'MG',
    nome: 'Minas Gerais',
    regiao: 'Sudeste',
    regiaoSlug: 'sudeste',
    stateSlug: 'minas-gerais',
    filePrefix: 'mg',
    cor: 'text-amber-700',
    corBg: 'bg-amber-50 border-amber-200',
    pagina: `${BASE}/sudeste/minas-gerais`,
  },
]

// ── Funções de URL ─────────────────────────────────────────────────────────────

function getPaginaUrl(estado: Estado, ano: number, slug: string): string {
  return `${BASE}/${estado.regiaoSlug}/${estado.stateSlug}/${ano}/${slug}/${slug}-${ano}`
}

function getDownloadUrl(estado: Estado, ano: number, p: Periodo): string | null {
  if (p.revisado) return null  // revisados: link para a página, não direct download
  const mesNum = MONTH_NUM[p.mes]
  if (!mesNum) return null
  return `${BASE}/${estado.regiaoSlug}/${estado.stateSlug}/${ano}/${p.slug}/${estado.filePrefix}-${mesNum}-${ano}.7z`
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function Sicro() {
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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SICRO — DNIT</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Sistema de Custos Referenciais de Obras · Preços por estado e período
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-blue-800">
          <span className="font-semibold">Arquivos .7z</span> — Os relatórios DNIT são comprimidos em formato 7-Zip.
          Instale o <a href="https://www.7-zip.org" target="_blank" rel="noopener noreferrer" className="underline font-medium">7-Zip gratuito</a> para extrair.
          Cada pacote contém planilhas Excel com preços de insumos e composições por estado.
        </div>
      </div>

      {/* Seletor de estado */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {ESTADOS.map((e) => (
          <button
            key={e.sigla}
            onClick={() => setActiveState(e.sigla)}
            className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              activeState === e.sigla
                ? e.corBg + ' border-current shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 ${
              activeState === e.sigla ? e.corBg : 'bg-gray-100'
            }`}>
              <span className={activeState === e.sigla ? e.cor : 'text-gray-500'}>{e.sigla}</span>
            </div>
            <div>
              <p className={`font-bold text-base ${activeState === e.sigla ? e.cor : 'text-gray-800'}`}>
                {e.nome}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <MapPin size={10} />
                Região {e.regiao}
              </p>
            </div>
            {activeState === e.sigla && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-current opacity-60" />
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo do estado selecionado */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        {/* Header do estado */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${estado.corBg}`}>
          <div>
            <h2 className={`font-bold text-base ${estado.cor}`}>
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
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border ${estado.corBg} ${estado.cor} hover:opacity-80 transition-opacity`}
          >
            <ExternalLink size={12} />
            Ver página oficial DNIT
          </a>
        </div>

        {/* Lista de anos */}
        <div className="divide-y divide-gray-100">
          {ANOS.map(({ ano, periodos }) => {
            const isExpanded = expandedYears.has(ano)
            const isLatest = ano === 2026

            return (
              <div key={ano}>
                {/* Linha do ano */}
                <button
                  onClick={() => toggleYear(ano)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={15} className="text-gray-400" />
                    <span className="font-semibold text-gray-900 text-sm">{ano}</span>
                    {isLatest && (
                      <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
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

                {/* Períodos do ano */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {periodos.map((p) => {
                        const pageUrl = getPaginaUrl(estado, ano, p.slug)
                        const dlUrl = getDownloadUrl(estado, ano, p)

                        return (
                          <div
                            key={p.slug}
                            className={`flex items-center gap-0 rounded-lg border overflow-hidden text-xs font-medium ${
                              p.revisado
                                ? 'border-purple-200'
                                : 'border-gray-200'
                            }`}
                          >
                            {/* Link para a página */}
                            <a
                              href={pageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                                p.revisado
                                  ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                  : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                              }`}
                              title={`Abrir ${p.label} ${ano} no DNIT`}
                            >
                              <ExternalLink size={11} />
                              {p.label}
                            </a>

                            {/* Botão de download direto (apenas períodos sem revisado) */}
                            {dlUrl && (
                              <a
                                href={dlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-2 bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 transition-colors border-l border-gray-200"
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

                    {/* Nomes dos arquivos */}
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
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <ExternalLink size={11} className="text-blue-500" />
          Abre a página do período no site do DNIT
        </span>
        <span className="flex items-center gap-1.5">
          <Download size={11} className="text-green-500" />
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

// ── Export de dados para o Dashboard ─────────────────────────────────────────

export { ESTADOS, ANOS, getPaginaUrl, getDownloadUrl }
