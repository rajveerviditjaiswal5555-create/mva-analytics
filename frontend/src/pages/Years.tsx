import { useApp } from '../store'
import { api } from '../api'
import Filters from '../components/Filters'
import { GrowthChart } from '../components/Charts'
import AnimatedNumber from '../components/AnimatedNumber'
import { useEffect, useState } from 'react'
import type { CompareReport, YearPoint } from '../types'

export default function Years() {
  const { filters, setFilters, options, overview } = useApp()
  const [years, setYears] = useState<YearPoint[]>([])
  const [compare, setCompare] = useState<number[]>([])
  const [year1, setYear1] = useState<number | null>(null)
  const [year2, setYear2] = useState<number | null>(null)
  const [comparison, setComparison] = useState<CompareReport | null>(null)

  useEffect(() => {
    api.years(filters).then(res => {
      setYears(res.years)
      setCompare(res.years.map(y => y.year))
    }).catch(() => undefined)
  }, [filters, overview])

  const toggle = (year: number) => setCompare(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year])

  useEffect(() => {
    if (year1 && year2 && year1 !== year2) {
      api.compare(filters, year1, year2).then(setComparison).catch(() => setComparison(null))
    }
  }, [filters, year1, year2])

  return (
    <>
      <Filters options={options} filters={filters} onChange={setFilters} />
      <div className="section-head">
        <div><h2>Year-wise Analysis</h2><p>Compare registrations across academic years · growth = ((current − previous) / previous) × 100</p></div>
      </div>

      <div className="card">
        <h3 className="card-title">Five-Year Trend</h3>
        <p className="card-sub">Interactive line graph of annual registrations</p>
        <GrowthChart data={years} height={340} />
      </div>

      <div className="section-head"><div><h2>Year Comparison</h2><p>Select years to highlight below</p></div></div>
      <div className="tabs">
        {years.map(y => (
          <button key={y.year} className={`tab ${compare.includes(y.year) ? 'active' : ''}`} onClick={() => toggle(y.year)}>{y.year}</button>
        ))}
      </div>

      <div className="grid kpi-grid">
        {years.filter(y => compare.includes(y.year)).map(y => (
          <div className="kpi" key={y.year} style={{ animation: 'fadeUp .4s both' }}>
            <div className="kpi-label">{y.year} Registrations</div>
            <div className="kpi-value"><AnimatedNumber value={y.students} /></div>
            <div className="kpi-foot">
              {y.growth === 0 ? 'Base year' : <span className={y.growth >= 0 ? 'up' : 'down'}>{y.growth >= 0 ? '▲' : '▼'} {Math.abs(y.growth)}% growth</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Year</th><th style={{ textAlign: 'right' }}>Students</th><th style={{ textAlign: 'right' }}>Change</th><th style={{ textAlign: 'right' }}>Growth %</th><th style={{ textAlign: 'right' }}>Cumulative</th><th>Visual</th></tr></thead>
            <tbody>
              {years.map((y, i) => {
                const max = Math.max(1, ...years.map(x => x.students))
                return <tr key={y.year} style={{ opacity: compare.includes(y.year) ? 1 : .65 }}>
                  <td style={{ fontWeight: 700 }}>{y.year}</td>
                  <td className="num">{y.students.toLocaleString('en-IN')}</td>
                  <td className="num">{i === 0 ? '—' : `${y.change >= 0 ? '+' : ''}${y.change.toLocaleString('en-IN')}`}</td>
                  <td className="num">{i === 0 ? '—' : <span className={`pill ${y.growth >= 0 ? 'green' : 'red'}`}>{y.growth >= 0 ? '+' : ''}{y.growth}%</span>}</td>
                  <td className="num">{y.cumulative.toLocaleString('en-IN')}</td>
                  <td style={{ width: 160 }}><div className="bar-track"><div className="bar-fill" style={{ width: `${y.students / max * 100}%` }} /></div></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        <div className="note" style={{ marginTop: 12 }}>
          Current year: <strong>{overview?.current_year ?? '—'}</strong> with <strong>{overview?.current_year_students.toLocaleString('en-IN') ?? '—'}</strong> registrations ·
          Previous year: <strong>{overview?.previous_year ?? '—'}</strong> with <strong>{overview?.previous_year_students.toLocaleString('en-IN') ?? '—'}</strong> ·
          Overall trend: <strong>{overview?.trend ?? '—'}</strong>
        </div>
      </div>

      <div className="section-head"><div><h2>Side-by-Side Year Comparison</h2><p>Compare any two years across every state and the top cities</p></div></div>
      <div className="card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="field" style={{ width: 160 }}>
            <label>First year</label>
            <select value={year1 ?? ''} onChange={e => setYear1(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select…</option>
              {years.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
            </select>
          </div>
          <div className="field" style={{ width: 160 }}>
            <label>Second year</label>
            <select value={year2 ?? ''} onChange={e => setYear2(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select…</option>
              {years.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
            </select>
          </div>
        </div>
        {comparison ? (
          <>
            <div className="grid kpi-grid" style={{ marginBottom: 14 }}>
              <div className="kpi"><div className="kpi-label">{comparison.year1} Students</div><div className="kpi-value"><AnimatedNumber value={comparison.total_year1} /></div></div>
              <div className="kpi"><div className="kpi-label">{comparison.year2} Students</div><div className="kpi-value"><AnimatedNumber value={comparison.total_year2} /></div></div>
              <div className="kpi"><div className="kpi-label">Overall Growth</div><div className="kpi-value" style={{ color: comparison.overall_growth >= 0 ? 'var(--green)' : 'var(--red)' }}><AnimatedNumber value={comparison.overall_growth} decimals={1} suffix="%" /></div></div>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>State</th><th style={{ textAlign: 'right' }}>{comparison.year1}</th><th style={{ textAlign: 'right' }}>{comparison.year2}</th><th style={{ textAlign: 'right' }}>Change</th><th style={{ textAlign: 'right' }}>Growth %</th></tr></thead>
                <tbody>{comparison.states.map(s => <tr key={s.state}>
                  <td>{s.state}</td><td className="num">{s.year1.toLocaleString('en-IN')}</td>
                  <td className="num">{s.year2.toLocaleString('en-IN')}</td>
                  <td className="num">{s.change >= 0 ? '+' : ''}{s.change}</td>
                  <td className="num"><span className={`pill ${s.growth >= 0 ? 'green' : 'red'}`}>{s.growth >= 0 ? '+' : ''}{s.growth}%</span></td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        ) : <div className="note">Choose two different years above to see the comparison.</div>}
      </div>
    </>
  )
}
