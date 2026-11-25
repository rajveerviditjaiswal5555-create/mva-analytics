import { useEffect, useRef, useState } from 'react'
import type { NamedStat } from '../types'

const COLORS = ['#6ba3ff', '#2dd4bf', '#f0c75e', '#a78bfa', '#fb7185', '#38bdf8', '#f472b6', '#4ade80', '#fbbf24', '#818cf8']
const R = 74, C = 2 * Math.PI * R

/** Custom SVG donut with JS-driven draw animation, hover lift and a live tooltip. */
export default function CountryDonut({ data, height = 320 }: { data: NamedStat[]; height?: number }) {
  const items = data.filter(d => d.students > 0).slice(0, 8)
  const total = items.reduce((s, d) => s + d.students, 0) || 1
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [point, setPoint] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  let offset = 0
  const segments = items.map((item, i) => {
    const fraction = item.students / total
    const dash = fraction * C
    const seg = { ...item, color: COLORS[i % COLORS.length], dash, offset, i }
    offset += dash
    return seg
  })

  const active = hover !== null ? segments[hover] : null

  return (
    <div className="country-donut" style={{ height }} ref={wrapRef}>
      <div className="donut-stage">
        <svg viewBox="0 0 200 200" className="donut-svg" onMouseLeave={() => setHover(null)}>
          <defs>
            {segments.map(s => (
              <linearGradient key={s.i} id={`seg-${s.i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity=".95" />
                <stop offset="100%" stopColor={s.color} stopOpacity=".55" />
              </linearGradient>
            ))}
            <filter id="donutGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="100" cy="100" r={R} className="donut-track" />
          {segments.map(s => (
            <circle
              key={s.i}
              cx="100" cy="100" r={R}
              fill="none"
              stroke={`url(#seg-${s.i})`}
              strokeWidth={hover === s.i ? 26 : 20}
              strokeDasharray={mounted ? `${Math.max(0, s.dash - 2)} ${C - Math.max(0, s.dash - 2)}` : `0 ${C}`}
              strokeDashoffset={-s.offset}
              transform="rotate(-90 100 100)"
              className={`donut-seg ${hover === s.i ? 'active' : ''}`}
              style={{ transitionDelay: `${s.i * 90}ms` }}
              onMouseEnter={e => {
                setHover(s.i)
                const rect = wrapRef.current?.getBoundingClientRect()
                if (rect) setPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseMove={e => {
                const rect = wrapRef.current?.getBoundingClientRect()
                if (rect) setPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
            />
          ))}
        </svg>
        <div className="donut-center">
          <strong>{active ? active.students.toLocaleString('en-IN') : total.toLocaleString('en-IN')}</strong>
          <span>{active ? active.name : 'Total students'}</span>
          <small>{active ? `${active.percentage}% share` : `${items.length} countries`}</small>
        </div>
        {active && (
          <div className="donut-tip" style={{ left: Math.min(point.x + 12, 210), top: Math.max(point.y - 30, 4) }}>
            <i style={{ background: active.color }} /> {active.name} · <strong>{active.percentage}%</strong>
          </div>
        )}
      </div>
      <div className="donut-legend">
        {segments.map(s => (
          <div key={s.i} className={`donut-legend-row ${hover === s.i ? 'active' : ''}`}
            onMouseEnter={() => setHover(s.i)} onMouseLeave={() => setHover(null)}>
            <i style={{ background: s.color, boxShadow: `0 0 10px -2px ${s.color}` }} />
            <span className="dl-name">{s.name}</span>
            <span className="dl-bar"><b style={{ width: mounted ? `${(s.students / total) * 100}%` : '0%', background: s.color, transitionDelay: `${s.i * 70}ms` }} /></span>
            <strong>{s.percentage}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
