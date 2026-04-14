import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import type { DisciplineSummary, CategoriaSummary } from '../../types'
import { formatBRL } from '../../types'

interface Props {
  data: (DisciplineSummary | CategoriaSummary)[]
  nameKey: 'disciplina' | 'categoria'
  title: string
}

const COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#ca8a04', '#16a34a', '#0891b2', '#4f46e5',
  '#be185d', '#b45309',
]

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.disciplina ?? d.categoria}</p>
      <p>Valor: <strong>{formatBRL(d.valor_total)}</strong></p>
      <p>Participação: <strong>{d.percentual?.toFixed(2)}%</strong></p>
      <p>Itens: <strong>{d.count_items}</strong></p>
    </div>
  )
}

export default function DisciplineChart({ data, nameKey, title }: Props) {
  if (!data.length) return <p className="text-center text-gray-400 py-12">Sem dados para exibir.</p>

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 80, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `R$${(v / 1_000_000).toFixed(1)}M`}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey={nameKey}
            tick={{ fontSize: 11 }}
            width={115}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="valor_total" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
            <LabelList
              dataKey="percentual"
              position="right"
              formatter={(v: number) => `${v.toFixed(1)}%`}
              style={{ fontSize: 10, fill: '#6b7280' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
