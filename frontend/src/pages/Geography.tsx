import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../api'
import Filters from '../components/Filters'
import RankTable from '../components/RankTable'
import { BarDistribution, RankedBars, StackedYearChart } from '../components/Charts'
import IndiaMap from '../components/IndiaMap'
import CountryDonut from '../components/CountryDonut'
import type { CountryInfo, StateInfo } from '../types'

export default function Geography() {
  const { filters, setFilters, options, overview } = useApp()
  const [states, setStates] = useState<StateInfo[]>([])
  const [countries, setCountries] = useState<CountryInfo[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.states(filters), api.countries(filters)]).then(([s, c]) => {
      setStates(s.states); setCountries(c.countries)
    }).catch(() => undefined).finally(() => setLoading(false))
  }, [filters, overview])

  const state = states.find(s => s.state === selected) || states[0]
  const years = [...new Set(states.flatMap(s => Object.keys(s.by_year)))].sort()

  return (
    <>
      <Filters options={options} filters={filters} onChange={setFilters} />
      <div className="section-head">
        <div><h2>Geographical Analytics</h2><p>State, district, city and country distribution — computed from the active dataset</p></div>
      </div>

      {loading && <div className="loading"><div className="spinner" />Loading geography…</div>}

      <div className="grid kpi-grid">
        <div className="kpi"><div className="kpi-label">States / Regions</div><div className="kpi-value">{states.length}</div></div>
        <div className="kpi"><div className="kpi-label">Countries</div><div className="kpi-value">{countries.length}</div></div>
        <div className="kpi"><div className="kpi-label">Cities</div><div className="kpi-value">{overview?.cities_count ?? 0}</div></div>
        <div className="kpi"><div className="kpi-label">Districts</div><div className="kpi-value">{overview?.districts_count ?? 0}</div></div>
      </div>

      <div className="card reveal" style={{ marginTop: 18 }}>
        <h3 className="card-title">Student Reach Across India</h3>
        <p className="card-sub">Interactive choropleth map · colour intensity shows registrations from each state</p>
        <IndiaMap data={states.map(s => ({ name: s.state, students: s.students, percentage: s.percentage }))} height={520} />
      </div>

      <div className="grid chart-grid" style={{ marginTop: 18 }}>
        <div className="card">
          <h3 className="card-title">Top 12 States</h3>
          <p className="card-sub">Bar chart with percentage share</p>
          <RankedBars data={states.map(s => ({ name: s.state, students: s.students, percentage: s.percentage }))} max={12} height={340} />
        </div>
        <div className="card">
          <h3 className="card-title">Country Distribution</h3>
          <p className="card-sub">Donut chart of represented countries</p>
          <CountryDonut data={countries.map(c => ({ name: c.country, students: c.students, percentage: c.percentage }))} height={320} />
        </div>
        <div className="card">
          <h3 className="card-title">State-wise Growth Over Time</h3>
          <p className="card-sub">Stacked registrations by year · top 6 states</p>
          <StackedYearChart states={states} />
        </div>
        <div className="card">
          <h3 className="card-title">Country Growth</h3>
          <p className="card-sub">Students by year for top countries</p>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Country</th><th style={{ textAlign: 'right' }}>Students</th><th style={{ textAlign: 'right' }}>Share</th><th style={{ textAlign: 'right' }}>Growth</th></tr></thead>
              <tbody>{countries.slice(0, 12).map(c => (
                <tr key={c.country}><td>{c.country}</td><td className="num">{c.students.toLocaleString('en-IN')}</td>
                  <td className="num">{c.percentage}%</td><td className="num"><span className={`pill ${c.growth >= 0 ? 'green' : 'red'}`}>{c.growth >= 0 ? '+' : ''}{c.growth}%</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section-head"><div><h2>Detailed State Analysis</h2><p>Select a state to inspect year-wise change</p></div></div>
      <div className="card">
        <div className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
          <label>Select state</label>
          <select value={selected || state?.state || ''} onChange={e => setSelected(e.target.value)}>
            {states.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
          </select>
        </div>
        {state && (
          <>
            <div className="grid kpi-grid" style={{ marginBottom: 14 }}>
              <div className="kpi"><div className="kpi-label">Students</div><div className="kpi-value">{state.students.toLocaleString('en-IN')}</div></div>
              <div className="kpi"><div className="kpi-label">Share of total</div><div className="kpi-value">{state.percentage}%</div></div>
              <div className="kpi"><div className="kpi-label">Rank</div><div className="kpi-value">#{state.rank}</div></div>
              <div className="kpi"><div className="kpi-label">Long-term growth</div><div className="kpi-value" style={{ color: state.growth >= 0 ? 'var(--green)' : 'var(--red)' }}>{state.growth >= 0 ? '+' : ''}{state.growth}%</div></div>
              <div className="kpi"><div className="kpi-label">Trend</div><div className="kpi-value" style={{ fontSize: 20, textTransform: 'capitalize' }}>{state.trend}</div></div>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Year</th><th style={{ textAlign: 'right' }}>Students</th><th style={{ textAlign: 'right' }}>Change</th><th style={{ textAlign: 'right' }}>Growth %</th></tr></thead>
                <tbody>
                  {years.map((year, i) => {
                    const count = state.by_year[year] || 0
                    const prev = i > 0 ? state.by_year[years[i - 1]] || 0 : 0
                    const change = i > 0 ? count - prev : 0
                    const growth = prev ? (change / prev * 100).toFixed(1) : '0.0'
                    return <tr key={year}><td>{year}</td><td className="num">{count.toLocaleString('en-IN')}</td>
                      <td className="num">{i > 0 ? `${change >= 0 ? '+' : ''}${change}` : '—'}</td>
                      <td className="num">{i > 0 ? <span className={`pill ${Number(growth) >= 0 ? 'green' : 'red'}`}>{growth}%</span> : '—'}</td></tr>
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="section-head"><div><h2>Rankings</h2><p>Full sortable tables</p></div></div>
      <div className="grid two-col">
        <RankTable data={states.map(s => ({ name: s.state, students: s.students, percentage: s.percentage, rank: s.rank }))} title="All States" />
        <RankTable data={countries.map(c => ({ name: c.country, students: c.students, percentage: c.percentage, rank: c.rank }))} title="All Countries" />
      </div>
    </>
  )
}
