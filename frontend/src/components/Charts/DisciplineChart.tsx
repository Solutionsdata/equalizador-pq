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

const PALETTES: Record<string, string[]> = {
  disciplina: ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#4f46e5', '#be185d', '#b45309'],
  categoria:  ['#0891b2', '#16a34a', '#ca8a04', '#ea580c', '#db2777', '#7c3aed', '#2563eb', '#4f46e5', '#be185d', '#b45309'],
  localidade: ['#0d9488', '#0369a1', '#7c3aed', '#b45309', '#15803d', '#be185d', '#4338ca', '#c2410c', '#0891b2', '#ca8a04'],
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
        <strong className="text-blue-700">{d.percentual?.toFixed(1)}%</strong>
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
  const height = Math.max(260, data.length * 42)
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
          margin={{ top: 0, right: 110, left: 140, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
          <XAxis
            type="number"
            tickFormatter={fmtMoney}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
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
          <Bar dataKey="valor_total" radius={[0, 4, 4, 0]} maxBarSize={30}>
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
