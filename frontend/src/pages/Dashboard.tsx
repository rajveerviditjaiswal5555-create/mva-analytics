import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../api'
import KpiCard from '../components/KpiCard'
import Filters from '../components/Filters'
import RankTable from '../components/RankTable'
import { DemoBanner, useReveal } from '../components/Layout'
import { BarDistribution, DonutChart, ForecastChart, GrowthChart } from '../components/Charts'
import AnimatedNumber from '../components/AnimatedNumber'
import type { Insight } from '../types'

export default function Dashboard() {
  const { overview, insights, quality, filters, setFilters, options, loading, error, refresh, navigate, user } = useApp()
  const [topCities, setTopCities] = useState<Array<{ name: string; students: number; percentage: number; rank: number }>>([])
  useReveal([overview, topCities])

  useEffect(() => {
    api.cities(filters).then(res => setTopCities(res.cities.slice(0, 10).map((c, i) => ({ ...c, rank: i + 1 })))).catch(() => undefined)
  }, [filters, overview])

  if (loading && !overview) return <div className="loading"><div className="spinner" />Loading analytics…</div>
  if (!overview) return <div className="empty">Unable to load analytics. {error}</div>

  const ov = overview
  const fc = ov.forecast
  const growthColor = (n: number) => n >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <>
      {user?.rank === 0 && <div className="note" style={{ marginBottom: 14 }}>🔒 You are viewing aggregate analytics as a guest. <button className="btn btn-sm" onClick={() => navigate('login')}>Sign in</button> for student search and administration.</div>}
      {error && <div className="login-error">⚠ {error} <button className="btn btn-sm" onClick={refresh}>Retry</button></div>}

      <Filters options={options} filters={filters} onChange={setFilters} />

      <div className="section-head">
        <div><h2>Student Analytics</h2><p>Overview of the selected dataset · all figures computed dynamically</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={refresh}>↻ Refresh</button>
          {user && user.rank >= 2 && <button className="btn btn-sm" onClick={async () => {
            const url = api.exportUrl('xlsx', filters)
            const token = api.getToken()
            const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            const blob = await res.blob()
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mva_analytics_report.xlsx'; a.click()
          }}>⤓ Export Excel</button>}
        </div>
      </div>

      <div className="grid kpi-grid">
        <KpiCard label="Total Students" value={ov.total_students} icon="◈" color="#2563eb" tint="#dbeafe"
          foot={<><AnimatedNumber value={ov.total_students} /> records analysed</>} index={0} />
        <KpiCard label="States / Regions" value={ov.states_count} icon="⬡" color="#7c3aed" tint="#ede9fe"
          foot={`${ov.districts_count} districts represented`} index={1} />
        <KpiCard label="Countries" value={ov.countries_count} icon="◎" color="#0d9488" tint="#ccfbf1"
          foot="Indian and overseas reach" index={2} />
        <KpiCard label="Cities" value={ov.cities_count} icon="◉" color="#db2777" tint="#fce7f3"
          foot="distinct locations" index={3} />
        <KpiCard label={`${ov.current_year} Registrations`} value={ov.current_year_students} icon="▤" color="#2563eb" tint="#dbeafe"
          foot={<span style={{ color: growthColor(ov.yoy_growth) }}>{ov.yoy_growth >= 0 ? '▲' : '▼'} {Math.abs(ov.yoy_growth)}% vs {ov.previous_year}</span>} index={4} />
        <KpiCard label="YoY Growth" value={ov.yoy_growth} icon="↗" color={ov.yoy_growth >= 0 ? '#059669' : '#dc2626'}
          tint={ov.yoy_growth >= 0 ? '#d1fae5' : '#fee2e2'} decimals={1} suffix="%" index={5}
          foot={`${ov.previous_year_students.toLocaleString('en-IN')} → ${ov.current_year_students.toLocaleString('en-IN')}`} />
        <KpiCard label="5-Year Growth" value={ov.five_year_growth} icon="∑" color="#c9a227" tint="#fef3c7"
          decimals={1} suffix="%" index={6} foot={<span style={{ textTransform: 'capitalize' }}>{ov.trend} trend</span>} />
        <KpiCard label={`${fc.next_year ?? ov.current_year + 1} Forecast`} value={fc.next_year_predicted ?? 0} icon="◇" color="#7c3aed" tint="#ede9fe"
          foot={<span className="pill amber">ESTIMATE</span>} index={7} />
      </div>

      <div className="section-head reveal">
        <div><h2>AI Insights</h2><p>Automatically generated from the currently selected data — no unsupported claims</p></div>
      </div>
      <div className="insight-list">
        {insights.map((insight, i) => (
          <div className={`insight ${insight.tone}`} key={i} style={{ animationDelay: `${i * 70}ms` }}>
            <div className="insight-ico">{{ trend: '↗', down: '↘', map: '⬡', up: '↑', spark: '✦', award: '★', globe: '◎', check: '✓' }[insight.icon] || '•'}</div>
            <span>{insight.text}</span>
          </div>
        ))}
        {insights.length === 0 && <div className="note">Apply a filter with sufficient data to generate insights.</div>}
      </div>

      <div className="section-head reveal">
        <div><h2>Visual Analytics</h2><p>Interactive charts · hover for details</p></div>
      </div>
      <div className="grid chart-grid">
        <div className="card reveal">
          <h3 className="card-title">Student Growth — Five-Year Trend</h3>
          <p className="card-sub">Annual registrations for the selected filters</p>
          <GrowthChart data={ov.yearly} />
        </div>
        <div className="card reveal">
          <h3 className="card-title">State Distribution</h3>
          <p className="card-sub">Top 8 states by student count</p>
          <BarDistribution data={ov.top_states} horizontal max={8} />
        </div>
        <div className="card reveal">
          <h3 className="card-title">Forecast — Historical + Predicted</h3>
          <p className="card-sub">{fc.method || '—'} · predictions are ESTIMATES</p>
          <ForecastChart points={fc.points} />
          {fc.validation && <div className="note" style={{ marginTop: 10 }}>
            Back-tested accuracy: MAE <strong>{fc.validation.mae}</strong> · RMSE <strong>{fc.validation.rmse}</strong>
            {fc.validation.mape != null && <> · MAPE <strong>{fc.validation.mape}%</strong></>}
          </div>}
        </div>
        <div className="card reveal">
          <h3 className="card-title">Country Distribution</h3>
          <p className="card-sub">Share of students by country</p>
          <DonutChart data={ov.top_countries} max={7} />
        </div>
      </div>

      <div className="section-head reveal">
        <div><h2>Rankings</h2><p>Sortable tables with share of total</p></div>
        <button className="btn btn-sm" onClick={() => navigate('geography')}>Full geographical analysis →</button>
      </div>
      <div className="grid two-col">
        <RankTable data={ov.top_states} title="Top 10 States" />
        <RankTable data={topCities} title="Top 10 Cities" />
      </div>

      <div className="grid two-col" style={{ marginTop: 16 }}>
        <div className="card reveal">
          <h3 className="card-title">Admission Status</h3>
          <p className="card-sub">Distribution within the selection</p>
          <BarDistribution data={ov.status_distribution} horizontal height={210} color="#0d9488" max={6} />
        </div>
        <div className="card reveal">
          <h3 className="card-title">Class Applied For</h3>
          <p className="card-sub">Students by class/grade</p>
          <BarDistribution data={ov.class_distribution} horizontal height={210} color="#7c3aed" max={7} />
        </div>
      </div>

      <div className="card reveal" style={{ marginTop: 16 }}>
        <h3 className="card-title">Data Quality Snapshot</h3>
        <p className="card-sub">Automatic validation of the selected records</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: quality && quality.score >= 95 ? 'var(--green)' : 'var(--amber)' }}>
            {quality ? <AnimatedNumber value={quality.score} suffix="%" /> : '—'}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ height: 8, background: 'var(--surface-tint)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${quality?.score ?? 0}%`, background: 'linear-gradient(90deg,#0d9488,#2563eb)', borderRadius: 5, transition: 'width .9s cubic-bezier(.2,.8,.2,1)' }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-500)', margin: '8px 0 0' }}>
              {quality?.records_with_issues ?? 0} of {quality?.total_records ?? 0} records flagged · status: {quality?.status || '—'}
            </p>
          </div>
          <button className="btn btn-sm" onClick={() => navigate('quality')}>View detailed report →</button>
        </div>
      </div>
    </>
  )
}
