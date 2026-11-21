import { useApp } from '../store'
import { api } from '../api'
import Filters from '../components/Filters'
import { GrowthChart } from '../components/Charts'
import AnimatedNumber from '../components/AnimatedNumber'
import { useEffect, useState } from 'react'
import type { YearPoint } from '../types'

export default function Years() {
  const { filters, setFilters, options, overview } = useApp()
  const [years, setYears] = useState<YearPoint[]>([])
  const [compare, setCompare] = useState<number[]>([])

  useEffect(() => {
    api.years(filters).then(res => {
      setYears(res.years)
      setCompare(res.years.map(y => y.year))
    }).catch(() => undefined)
  }, [filters, overview])

  const toggle = (year: number) => setCompare(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year])

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
    </>
  )
}
