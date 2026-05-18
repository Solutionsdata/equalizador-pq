import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from 'recharts'
import type { DisciplineSummary, CategoriaSummary, LocalidadeSummary } from '../../types'
import { formatBRL } from '../../types'

type SummaryItem = DisciplineSummary | CategoriaSummary | LocalidadeSummary

interface Props {
  data: SummaryItem[]
  nameKey: 'disciplina' | 'categoria' | 'localidade'
  title: string
}

// Paleta EPR: Verde, Azul, Amarelo, Cinza + variações
const PALETTES: Record<string, string[]> = {
  disciplina: ['#1A3A6B', '#1B7C3E', '#F5A623', '#6B7280', '#145C2E', '#0E2650', '#D4891A', '#4B5563', '#2D5A1B', '#1E4DB3'],
  categoria:  ['#1B7C3E', '#1A3A6B', '#F5A623', '#6B7280', '#145C2E', '#0E2650', '#D4891A', '#4B5563', '#2D5A1B', '#374151'],
  localidade: ['#1A3A6B', '#1B7C3E', '#F5A623', '#9CA3AF', '#0E2650', '#145C2E', '#D4891A', '#6B7280', '#2D5A1B', '#374151'],
}

const CustomTooltip = ({ active, payload, nameKey }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const name = d[nameKey] ?? '—'
  const avg = d.count_items > 0 ? Number(d.valor_total) / d.count_items : 0
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-md text-xs space-y-1 min-w-[190px]">
      <p className="font-semibold text-gray-800 text-sm truncate">{name}</p>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Valor total</span>
        <strong className="text-gray-900">{formatBRL(Number(d.valor_total))}</strong>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Participação</span>
        <strong style={{ color: '#1A3A6B' }}>{d.percentual?.toFixed(1)}%</strong>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Itens</span>
        <strong className="text-gray-700">{d.count_items}</strong>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Preço médio/item</span>
        <strong className="text-purple-700">{formatBRL(avg)}</strong>
      </div>
    </div>
  )
}

export default function DisciplineChart({ data, nameKey, title }: Props) {
  if (!data.length) return <p className="text-center text-gray-400 py-8 text-sm">Sem dados — preencha o campo "{nameKey}" nos itens da PQ.</p>

  const colors = PALETTES[nameKey] ?? PALETTES.disciplina
  const height = Math.max(260, data.length * 36)
  const total = data.reduce((s, d) => s + Number((d as any).valor_total), 0)
  const totalItems = data.reduce((s, d) => s + (d as any).count_items, 0)
  const avgPerItem = totalItems > 0 ? total / totalItems : 0

  function fmtMoney(v: number) {
    if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
    return `R$${v.toFixed(0)}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{data.length} grupos · {totalItems} itens</span>
          <span className="font-semibold text-gray-800">{formatBRL(total)}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 220, left: 140, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
          <XAxis
            type="number"
            tickFormatter={fmtMoney}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            domain={[0, (dataMax: number) => dataMax * 1.55]}
            allowDataOverflow={false}
          />
          <YAxis
            type="category"
            dataKey={nameKey}
            tick={{ fontSize: 11, fill: '#374151' }}
            width={135}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip nameKey={nameKey} />} />
          <ReferenceLine x={avgPerItem} stroke="#7c3aed" strokeDasharray="4 3" strokeOpacity={0.6} />
          <Bar dataKey="valor_total" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
            <LabelList
              content={({ x, y, width, height: h, value, index }: any) => {
                const item = data[index] as any
                const pct = item?.percentual ?? 0
                const cnt = item?.count_items ?? 0
                return (
                  <g>
                    <text
                      x={Number(x) + Number(width) + 6}
                      y={Number(y) + Number(h) / 2}
                      fill="#374151"
                      fontSize={10}
                      fontWeight={500}
                      dominantBaseline="middle"
                    >
                      {fmtMoney(Number(value))} · {pct.toFixed(1)}% · {cnt}it
                    </text>
                  </g>
                )
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-purple-600 mt-2 text-right">— linha roxa = preço médio por item ({formatBRL(avgPerItem)})</p>
    </div>
  )
}
