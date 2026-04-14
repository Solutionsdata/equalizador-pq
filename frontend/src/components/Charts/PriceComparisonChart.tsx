import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ProposalComparisonItem, EqualizationProposal } from '../../types'
import { formatBRL } from '../../types'

interface Props {
  items: ProposalComparisonItem[]
  proposals: EqualizationProposal[]
  maxItems?: number
}

const COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#ca8a04', '#16a34a', '#0891b2', '#4f46e5',
  '#be185d', '#b45309',
]

export default function PriceComparisonChart({ items, proposals, maxItems = 20 }: Props) {
  if (!items.length || !proposals.length) {
    return <p className="text-center text-gray-400 py-12">Sem dados para exibir.</p>
  }

  // Usa apenas os primeiros N itens para não poluir o gráfico
  const slice = items.slice(0, maxItems)

  const chartData = slice.map((item) => {
    const row: Record<string, string | number | null> = {
      label: item.numero_item,
      fullDesc: item.descricao,
    }
    proposals.forEach((p) => {
      row[p.empresa] = item.precos[String(p.id)] ?? null
    })
    return row
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const item = slice.find((i) => i.numero_item === label)
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-xs max-w-xs">
        <p className="font-semibold text-gray-800 mb-1 truncate">{item?.descricao}</p>
        {payload.map((p: any) => (
          <p key={p.name}>
            <span style={{ color: p.fill }}>■</span> {p.name}:{' '}
            <strong>{formatBRL(p.value)}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9 }}
          angle={-45}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {proposals.map((p, i) => (
          <Bar
            key={p.id}
            dataKey={p.empresa}
            fill={COLORS[i % COLORS.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
