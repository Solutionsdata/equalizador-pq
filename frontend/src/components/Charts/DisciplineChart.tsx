import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import type { DisciplineSummary, CategoriaSummary, LocalidadeSummary } from '../../types'
import { formatBRL } from '../../types'

type SummaryItem = DisciplineSummary | CategoriaSummary | LocalidadeSummary

interface Props {
  data: SummaryItem[]
  nameKey: 'disciplina' | 'categoria' | 'localidade'
  title: string
  color?: string
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-md text-xs space-y-1 min-w-[180px]">
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
    </div>
  )
}

export default function DisciplineChart({ data, nameKey, title, color }: Props) {
  if (!data.length) return <p className="text-center text-gray-400 py-8 text-sm">Sem dados — preencha o campo "{nameKey}" nos itens da PQ.</p>

  const colors = PALETTES[nameKey] ?? PALETTES.disciplina
  const height = Math.max(260, data.length * 36)
  const total = data.reduce((s, d) => s + Number((d as any).valor_total), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{data.length} grupos</span>
          <span className="font-medium text-gray-700">{formatBRL(total)}</span>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {data.map((d, i) => {
          const name = (d as any)[nameKey]
          const pct = (d as any).percentual
          return (
            <div key={name} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-gray-600">{name}</span>
              <span className="text-gray-400">({pct?.toFixed(1)}%)</span>
            </div>
          )
        })}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 90, left: 130, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
          <XAxis
            type="number"
            tickFormatter={(v) => v >= 1_000_000 ? `R$${(v / 1_000_000).toFixed(1)}M` : `R$${(v / 1_000).toFixed(0)}k`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey={nameKey}
            tick={{ fontSize: 11, fill: '#374151' }}
            width={125}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip nameKey={nameKey} />} />
          <Bar dataKey="valor_total" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
            <LabelList
              dataKey="percentual"
              position="right"
              formatter={(v: number) => `${v.toFixed(1)}%`}
              style={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
