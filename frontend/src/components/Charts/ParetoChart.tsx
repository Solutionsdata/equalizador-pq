import React from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import type { ABCItem } from '../../types'
import { formatBRL } from '../../types'

interface Props {
  items: ABCItem[]
}

const CLASS_COLORS: Record<string, string> = {
  A: '#2563eb',
  B: '#f59e0b',
  C: '#10b981',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ABCItem
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs max-w-xs">
      <p className="font-semibold text-gray-800 mb-1 truncate">{d?.descricao}</p>
      <p>Valor: <strong>{formatBRL(d?.valor_total)}</strong></p>
      <p>% Participação: <strong>{d?.percentual?.toFixed(2)}%</strong></p>
      <p>% Acumulado: <strong>{d?.percentual_acumulado?.toFixed(2)}%</strong></p>
      <p>Classe: <strong className={`text-${d?.classe === 'A' ? 'blue' : d?.classe === 'B' ? 'amber' : 'green'}-600`}>{d?.classe}</strong></p>
    </div>
  )
}

export default function ParetoChart({ items }: Props) {
  if (!items.length) return <p className="text-center text-gray-400 py-12">Sem dados para exibir.</p>

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={items} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="posicao"
          label={{ value: 'Itens (ordenados por valor)', position: 'insideBottom', offset: -45, fontSize: 11 }}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          yAxisId="valor"
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10 }}
          label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10 }}
          label={{ value: '% Acumulado', angle: 90, position: 'insideRight', offset: 15, fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="valor" dataKey="valor_total" name="Valor do Item" radius={[2, 2, 0, 0]}>
          {items.map((entry) => (
            <Cell key={entry.pq_item_id} fill={CLASS_COLORS[entry.classe]} />
          ))}
        </Bar>
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="percentual_acumulado"
          name="% Acumulado"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
