import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ReferenceLine, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { ForecastPoint, NamedStat, YearPoint } from '../types'

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)', 'var(--chart-9)', 'var(--chart-10)']

const tooltipStyle = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 6, fontSize: 11, boxShadow: '0 8px 24px -8px rgba(0,0,0,.28)', color: 'var(--ink-900)',
}

const fmt = (value: number) => Math.round(value).toLocaleString('en-IN')

export function GrowthChart({ data, height = 290 }: { data: YearPoint[]; height?: number }) {
  return (
    <div className="chart-box chart-enter" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="growthLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--chart-2)" />
              <stop offset="100%" stopColor="#0d99ff" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} dy={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={fmt} width={52} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(Number(v)), 'Students']} />
          {data.length > 0 && <ReferenceDot x={data.at(-1)!.year} y={data.at(-1)!.students} r={5} fill="var(--chart-3)" stroke="#fff" strokeWidth={2} isFront />}
          <Area type="monotone" dataKey="students" stroke="url(#growthLine)" strokeWidth={2.5}
            fill="url(#growthFill)" animationDuration={1100} dot={{ r: 3.5, fill: 'var(--surface)', strokeWidth: 2.5, stroke: 'var(--chart-1)' }}
            activeDot={{ r: 7, strokeWidth: 3, fill: 'var(--chart-1)' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ForecastChart({ points, height = 320 }: { points: ForecastPoint[]; height?: number }) {
  const data = points.map(p => ({
    year: p.year,
    actual: p.actual,
    predicted: p.predicted,
    base: p.lower ?? 0,
    band: p.lower != null && p.upper != null ? Math.max(0, p.upper - p.lower) : 0,
  }))
  const lastActual = points.filter(p => !p.is_forecast).at(-1)?.year
  return (
    <div className="chart-box chart-enter" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 14, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.20} />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} dy={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={fmt} domain={['auto', 'auto']} width={52} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [fmt(Number(v)), name === 'actual' ? 'Actual students' : 'Predicted (ESTIMATE)']} />
          <Legend formatter={(v) => v === 'actual' ? 'Historical actual' : v === 'predicted' ? 'Forecast estimate' : 'Uncertainty range'} wrapperStyle={{ fontSize: 10 }} />
          {lastActual && <ReferenceLine x={lastActual} stroke="var(--chart-3)" strokeDasharray="4 4" label={{ value: 'Forecast →', fontSize: 10, fill: 'var(--chart-3)', position: 'insideTopRight' }} />}
          <Area dataKey="base" stackId="uncertainty" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" tooltipType="none" />
          <Area dataKey="band" stackId="uncertainty" stroke="none" fill="url(#bandFill)" isAnimationActive={false} name="Uncertainty range" tooltipType="none" />
          <Line type="monotone" dataKey="actual" stroke="var(--chart-1)" strokeWidth={2.8}
            dot={{ r: 3.5, fill: 'var(--chart-1)' }} connectNulls animationDuration={1000} />
          <Line type="monotone" dataKey="predicted" stroke="var(--chart-3)" strokeWidth={2.8} strokeDasharray="7 5"
            dot={{ r: 3.5, fill: 'var(--chart-3)' }} connectNulls animationDuration={1200} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RankedBars({ data, height = 320, max = 12 }: { data: NamedStat[]; height?: number; max?: number }) {
  const items = data.slice(0, max)
  const top = Math.max(1, ...items.map(d => d.students))
  return (
    <div className="chart-box chart-enter ranked-bars" style={{ height }}>
      {items.map((item, i) => (
        <div className="rb-row" key={item.name} style={{ animationDelay: `${i * 55}ms` }}>
          <span className="rb-rank">{String(i + 1).padStart(2, '0')}</span>
          <span className="rb-name" title={item.name}>{item.name}</span>
          <span className="rb-track"><b style={{ width: `${(item.students / top) * 100}%`, background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 2) % PALETTE.length]})`, transitionDelay: `${i * 55}ms` }} /></span>
          <strong className="rb-value">{fmt(item.students)}</strong>
          <small className="rb-pct">{item.percentage}%</small>
        </div>
      ))}
    </div>
  )
}

export function BarDistribution({ data, title = '', height = 290, color = '#2563eb', max = 10, horizontal = false }: {
  data: NamedStat[]; title?: string; height?: number; color?: string; max?: number; horizontal?: boolean
}) {
  const items = data.slice(0, max)
  if (horizontal) {
    return (
      <div className="chart-box chart-enter" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} layout="vertical" margin={{ top: 4, right: 16, left: 16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--line)" />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={fmt} />
            <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(Number(v)), 'Students']} />
            <Bar dataKey="students" fill={color} radius={[0, 4, 4, 0]} animationDuration={900}>
              {items.map((entry, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }
  return (
    <div className="chart-box chart-enter" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} dy={8} tick={{ fontSize: 10 }} interval={0}
            tickFormatter={(v: string) => v.length > 13 ? v.slice(0, 11) + '…' : v} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={fmt} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(Number(v)), 'Students']} />
          <Bar dataKey="students" radius={[4, 4, 0, 0]} animationDuration={900}>
            {items.map((entry, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DonutChart({ data, height = 290, max = 8 }: { data: NamedStat[]; height?: number; max?: number }) {
  const items = data.slice(0, max)
  return (
    <div className="chart-box chart-enter" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={items} dataKey="students" nameKey="name" cx="50%" cy="50%"
            innerRadius="52%" outerRadius="78%" paddingAngle={2} animationDuration={1000}
            label={(p) => `${p.percentage != null ? Number(p.percentage).toFixed(1) : ''}%`}
            labelLine={{ stroke: 'var(--ink-400)' }}>
            {items.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [fmt(Number(v)), String(n)]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StackedYearChart({ states }: {
  states: Array<{ state: string; by_year: Record<string, number> }>
}) {
  const top = states.slice(0, 6)
  const years = [...new Set(top.flatMap(s => Object.keys(s.by_year)))].sort()
  const data = years.map(year => {
    const row: Record<string, string | number> = { year }
    top.forEach(s => { row[s.state] = s.by_year[year] || 0 })
    return row
  })
  return (
    <div className="chart-box tall chart-enter">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} dy={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={fmt} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {top.map((s, i) => <Bar key={s.state} dataKey={s.state} stackId="a" fill={PALETTE[i % PALETTE.length]} animationDuration={900} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MultiLineChart({ data, series, height = 300, valueFormatter = fmt }: {
  data: Array<Record<string, number | string>>
  series: Array<{ key: string; name: string; color: string; dashed?: boolean }>
  height?: number
  valueFormatter?: (v: number) => string
}) {
  return (
    <div className="chart-box chart-enter" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} dy={8} tick={{ fontSize: 10 }} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => valueFormatter(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {series.map(s => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color}
              strokeWidth={2.6} strokeDasharray={s.dashed ? '6 4' : undefined}
              dot={{ r: 2.5 }} animationDuration={850} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GenderPie({ data }: { data: NamedStat[] }) {
  return (
    <div className="chart-box short chart-enter">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="students" nameKey="name" cx="50%" cy="50%"
            outerRadius="72%" animationDuration={900} label>
            {data.map((_, i) => <Cell key={i} fill={['var(--chart-1)', 'var(--chart-5)', 'var(--chart-4)'][i % 3]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
