import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ParetoData } from '../../types'
import { formatBRL } from '../../types'

interface Props {
  data: ParetoData
}

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return percent > 0.04 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight="bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  ) : null
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const e = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow text-xs min-w-[160px]">
      <p className="font-semibold text-gray-800 mb-1">{e.name}</p>
      <p className="flex justify-between gap-4"><span className="text-gray-500">Valor:</span><strong>{formatBRL(e.value)}</strong></p>
    </div>
  )
}

export default function ABCCurveChart({ data }: Props) {
  const pieData = [
    { name: `Classe A — ${data.count_a} itens`, value: Number(data.valor_a), color: '#2563eb' },
    { name: `Classe B — ${data.count_b} itens`, value: Number(data.valor_b), color: '#f59e0b' },
    { name: `Classe C — ${data.count_c} itens`, value: Number(data.valor_c), color: '#10b981' },
  ].filter((d) => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={140}
          innerRadius={55}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
        >
          {pieData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
