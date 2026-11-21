import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { ForecastPoint, NamedStat, YearPoint } from '../types'

const PALETTE = ['#2563eb', '#0d9488', '#c9a227', '#7c3aed', '#dc2626', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5']

const tooltipStyle = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 10, fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,.12)', color: 'var(--ink-900)',
}

const fmt = (value: number) => Math.round(value).toLocaleString('en-IN')

export function GrowthChart({ data, height = 290 }: { data: YearPoint[]; height?: number }) {
  return (
    <div className="chart-box chart-enter" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} dy={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={fmt} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(Number(v)), 'Students']} />
          <Area type="monotone" dataKey="students" stroke="#2563eb" strokeWidth={2.6}
            fill="url(#growthFill)" animationDuration={900} dot={{ r: 4, fill: '#fff', strokeWidth: 2.5, stroke: '#2563eb' }}
            activeDot={{ r: 6, strokeWidth: 3 }} />
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
    lower: p.lower,
    upper: p.upper,
  }))
  const lastActual = points.filter(p => !p.is_forecast).at(-1)?.year
  return (
    <div className="chart-box chart-enter" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 14, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} dy={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={fmt} domain={['auto', 'auto']} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [fmt(Number(v)), name === 'actual' ? 'Actual students' : 'Predicted (ESTIMATE)']} />
          <Legend formatter={(v) => v === 'actual' ? 'Historical actual' : 'Forecast estimate'} wrapperStyle={{ fontSize: 11 }} />
          {lastActual && <ReferenceLine x={lastActual} stroke="#c9a227" strokeDasharray="4 4" label={{ value: 'Forecast →', fontSize: 10, fill: '#b45309', position: 'insideTopRight' }} />}
          <Line type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={3}
            dot={{ r: 3.5, fill: '#2563eb' }} connectNulls animationDuration={900} />
          <Line type="monotone" dataKey="predicted" stroke="#c9a227" strokeWidth={3} strokeDasharray="7 5"
            dot={{ r: 3.5, fill: '#c9a227' }} connectNulls animationDuration={1100} />
        </LineChart>
      </ResponsiveContainer>
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
            <Bar dataKey="students" fill={color} radius={[0, 6, 6, 0]} animationDuration={900}>
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
          <Bar dataKey="students" radius={[6, 6, 0, 0]} animationDuration={900}>
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
            {data.map((_, i) => <Cell key={i} fill={['#3b82f6', '#ec4899', '#a855f7'][i % 3]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
