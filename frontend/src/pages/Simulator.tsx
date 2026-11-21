import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../api'
import Filters from '../components/Filters'
import { MultiLineChart } from '../components/Charts'
import AnimatedNumber from '../components/AnimatedNumber'

const PRESETS = [-20, -15, -10, -5, 5, 10, 15, 20]

export default function Simulator() {
  const { filters, setFilters, options, overview } = useApp()
  const [growth, setGrowth] = useState(10)
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.whatIf>> | null>(null)
  const [horizon, setHorizon] = useState(5)

  useEffect(() => {
    api.whatIf(filters, growth, horizon).then(setResult).catch(() => undefined)
  }, [filters, growth, horizon, overview])

  const current = result?.current ?? overview?.current_year_students ?? 0
  const whatIf = result?.what_if
  const scenarios = result?.scenarios || {}

  const scenarioData = Array.from({ length: horizon + 1 }, (_, i) => {
    const row: Record<string, number | string> = { name: i === 0 ? 'Now' : `+${i}y` }
    Object.entries(scenarios).forEach(([name, points]) => { row[name] = points[i]?.students ?? 0 })
    return row
  })

  const colors = ['#dc2626', '#0891b2', '#2563eb', '#d97706', '#059669']

  return (
    <>
      <Filters options={options} filters={filters} onChange={setFilters} />
      <div className="section-head">
        <div><h2>What-If Student Forecast</h2><p>Predicted Students = Current Students × (1 + Growth Rate)ⁿ — an interactive scenario simulator</p></div>
      </div>

      <div className="grid two-col">
        <div className="card">
          <h3 className="card-title">Growth / Decline Control</h3>
          <p className="card-sub">Enter a percentage change or choose a preset</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
            <input type="range" min={-30} max={40} step={1} value={growth} onChange={e => setGrowth(Number(e.target.value))}
              style={{ flex: 1, accentColor: growth >= 0 ? '#059669' : '#dc2626' }} />
            <div style={{
              minWidth: 78, textAlign: 'center', padding: '9px 12px', borderRadius: 10, fontWeight: 700, fontSize: 18,
              background: growth >= 0 ? '#d1fae5' : '#fee2e2', color: growth >= 0 ? '#065f46' : '#991b1b',
            }}>
              {growth >= 0 ? '+' : ''}{growth}%
            </div>
          </div>
          <div className="tabs">
            {PRESETS.map(p => <button key={p} className={`tab ${growth === p ? 'active' : ''}`} onClick={() => setGrowth(p)}>{p >= 0 ? '+' : ''}{p}%</button>)}
          </div>
          <div className="divider" />
          <div className="field" style={{ maxWidth: 200 }}>
            <label>Projection horizon</label>
            <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}>
              {[3, 5, 10].map(h => <option key={h} value={h}>{h} years</option>)}
            </select>
          </div>
          <div className="note" style={{ marginTop: 14 }}>
            Simulation uses the current-year count of <strong>{current.toLocaleString('en-IN')}</strong> ({result?.current_year ?? overview?.current_year}) as the base. Values shown are illustrative scenarios, not forecasts from the statistical model.
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Selected Scenario Result</h3>
          <p className="card-sub">{growth >= 0 ? 'Growth' : 'Decline'} of {Math.abs(growth)}% compounded annually</p>
          <div className="grid kpi-grid" style={{ marginBottom: 12 }}>
            <div className="kpi"><div className="kpi-label">Current Students</div><div className="kpi-value"><AnimatedNumber value={current} /></div></div>
            <div className="kpi">
              <div className="kpi-label">Next Year</div>
              <div className="kpi-value" style={{ color: growth >= 0 ? 'var(--green)' : 'var(--red)' }}>
                <AnimatedNumber value={whatIf?.points[1]?.students ?? 0} />
              </div>
            </div>
            <div className="kpi"><div className="kpi-label">In {horizon} Years</div><div className="kpi-value"><AnimatedNumber value={whatIf?.points.at(-1)?.students ?? 0} /></div></div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Period</th><th style={{ textAlign: 'right' }}>Projected students</th><th style={{ textAlign: 'right' }}>Change vs now</th></tr></thead>
              <tbody>{whatIf?.points.map(p => (
                <tr key={p.year_offset}><td>{p.year_offset === 0 ? 'Current' : `Year +${p.year_offset}`}</td>
                  <td className="num">{Math.round(p.students).toLocaleString('en-IN')}</td>
                  <td className="num">{p.year_offset === 0 ? '—' : <span className={`pill ${p.students >= current ? 'green' : 'red'}`}>{p.students >= current ? '+' : ''}{Math.round(p.students - current).toLocaleString('en-IN')}</span>}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 className="card-title">Scenario Comparison</h3>
        <p className="card-sub">Current trend vs optimistic, normal and declining scenarios</p>
        <MultiLineChart data={scenarioData}
          series={Object.keys(scenarios).map((name, i) => ({ key: name, name, color: colors[i % colors.length] }))}
          height={360} />
      </div>

      <div className="section-head"><div><h2>Scenario Summary · {horizon} Years</h2><p>Final projected counts under each growth assumption</p></div></div>
      <div className="grid kpi-grid">
        {Object.entries(scenarios).map(([name, points], i) => {
          const final = points.at(-1)?.students ?? 0
          return <div className="kpi" key={name} style={{ ['--kpi-color' as string]: colors[i % colors.length], animation: `fadeUp .4s ${i * 50}ms both` }}>
            <div className="kpi-label">{name}</div>
            <div className="kpi-value"><AnimatedNumber value={final} /></div>
            <div className="kpi-foot">{final >= current ? <span className="up">▲ +{Math.round(final - current).toLocaleString('en-IN')}</span> : <span className="down">▼ {Math.round(final - current).toLocaleString('en-IN')}</span>} vs now</div>
          </div>
        })}
      </div>
    </>
  )
}
