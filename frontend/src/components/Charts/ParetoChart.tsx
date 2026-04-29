import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
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

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ABCItem
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs max-w-xs">
      <p className="font-semibold text-gray-800 mb-1.5 truncate">#{d?.posicao} — {d?.descricao}</p>
      <div className="space-y-0.5">
        <p className="flex justify-between gap-6"><span className="text-gray-500">Valor:</span><strong>{formatBRL(Number(d?.valor_total))}</strong></p>
        <p className="flex justify-between gap-6"><span className="text-gray-500">Participação:</span><strong>{d?.percentual?.toFixed(2)}%</strong></p>
        <p className="flex justify-between gap-6"><span className="text-gray-500">Acumulado:</span><strong>{d?.percentual_acumulado?.toFixed(2)}%</strong></p>
        <p className="flex justify-between gap-6"><span className="text-gray-500">Classe:</span>
          <strong className={d?.classe === 'A' ? 'text-blue-600' : d?.classe === 'B' ? 'text-amber-600' : 'text-green-600'}>{d?.classe}</strong>
        </p>
      </div>
    </div>
  )
}

function fmtMoney(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

export default function ParetoChart({ items }: Props) {
  if (!items.length) return <p className="text-center text-gray-400 py-12">Sem dados para exibir.</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs">
        {(['A', 'B', 'C'] as const).map((cls) => (
          <div key={cls} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: CLASS_COLORS[cls] }} />
            <span className="text-gray-600">Classe {cls}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="w-6 h-0.5 bg-red-500 inline-block" />
          <span className="text-gray-600">% Acumulado</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={items} margin={{ top: 10, right: 60, left: 16, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="posicao"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            label={{ value: 'Itens (ordenados por valor)', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#6b7280' }}
            tickCount={Math.min(items.length, 20)}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="valor"
            tickFormatter={fmtMoney}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine yAxisId="pct" y={80} stroke="#2563eb" strokeDasharray="4 3" strokeOpacity={0.5} />
          <ReferenceLine yAxisId="pct" y={95} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
          <Bar yAxisId="valor" dataKey="valor_total" name="Valor do Item" radius={[2, 2, 0, 0]} maxBarSize={16}>
            {items.map((entry) => (
              <Cell key={entry.pq_item_id} fill={CLASS_COLORS[entry.classe]} fillOpacity={0.85} />
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
    </div>
  )
}
