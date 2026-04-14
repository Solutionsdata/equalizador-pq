import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ParetoData } from '../../types'
import { formatBRL } from '../../types'

interface Props {
  data: ParetoData
}

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return percent > 0.03 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  ) : null
}

export default function ABCCurveChart({ data }: Props) {
  const pieData = [
    { name: `Classe A (${data.count_a} itens)`, value: Number(data.valor_a), color: '#2563eb' },
    { name: `Classe B (${data.count_b} itens)`, value: Number(data.valor_b), color: '#f59e0b' },
    { name: `Classe C (${data.count_c} itens)`, value: Number(data.valor_c), color: '#10b981' },
  ].filter((d) => d.value > 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const entry = payload[0]
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-xs">
        <p className="font-semibold">{entry.name}</p>
        <p>Valor: <strong>{formatBRL(entry.value)}</strong></p>
        <p>Participação: <strong>{entry.payload.percent ? (entry.payload.percent * 100).toFixed(2) : '—'}%</strong></p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumo ABC */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { cls: 'A', count: data.count_a, valor: data.valor_a, color: 'blue', pct: '~80%' },
          { cls: 'B', count: data.count_b, valor: data.valor_b, color: 'amber', pct: '~15%' },
          { cls: 'C', count: data.count_c, valor: data.valor_c, color: 'green', pct: '~5%' },
        ].map(({ cls, count, valor, color, pct }) => (
          <div key={cls} className={`card p-4 border-l-4 border-${color}-500`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-medium">CLASSE {cls}</p>
                <p className="text-xl font-bold text-gray-800">{count} itens</p>
                <p className="text-sm text-gray-600">{formatBRL(Number(valor))}</p>
              </div>
              <span className={`text-2xl font-black text-${color}-500`}>{cls}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{pct} do valor total</p>
          </div>
        ))}
      </div>

      {/* Gráfico de pizza */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs text-gray-700">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
