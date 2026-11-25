import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../api'
import KpiCard from '../components/KpiCard'
import Filters from '../components/Filters'
import RankTable from '../components/RankTable'
import Icon from '../components/Icon'
import { useReveal } from '../components/Layout'
import { BarDistribution, ForecastChart, GrowthChart } from '../components/Charts'
import CountryDonut from '../components/CountryDonut'
import AnimatedNumber from '../components/AnimatedNumber'
import type { Insight } from '../types'

export default function Dashboard() {
  const { overview, insights, quality, filters, setFilters, options, loading, error, refresh, navigate, user } = useApp()
  const [topCities, setTopCities] = useState<Array<{ name: string; district?: string; students: number; percentage: number; rank: number }>>([])
  useReveal([overview, topCities])

  useEffect(() => {
    api.cities(filters).then(res => setTopCities(res.cities.slice(0, 10).map((c, i) => ({ ...c, rank: i + 1 })))).catch(() => undefined)
  }, [filters, overview])

  if (loading && !overview) return <div className="loading"><div className="spinner" />Loading analytics…</div>
  if (!overview) return <div className="empty">Unable to load analytics. {error}</div>

  const ov = overview
  const fc = ov.forecast
  const growthColor = (n: number) => n >= 0 ? 'var(--green)' : 'var(--red)'
  const maxYear = Math.max(1, ...ov.yearly.map(y => y.students))

  return (
    <>
      {user?.rank === 0 && <div className="note" style={{ marginBottom: 12 }}>🔒 You are viewing aggregate analytics as a guest. <button className="btn btn-sm" onClick={() => navigate('login')}>Sign in</button> for student search and administration.</div>}
      {error && <div className="login-error">⚠ {error} <button className="btn btn-sm" onClick={refresh}>Retry</button></div>}

      {ov.is_demo && <div className="demo-note"><strong>DEMO DATA:</strong> All figures on this dashboard are generated from synthetic demonstration records and do not represent actual Macro Vision Academy students. Authorised staff can replace this with official data from the Admin Panel.</div>}

      <Filters options={options} filters={filters} onChange={setFilters} />

      <div className="overview-head">
        <div>
          <div className="eyebrow">Dataset overview</div>
          <h1>Student analytics</h1>
          <p>Every figure below is computed dynamically from the selected records.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-sm" onClick={refresh}><Icon name="refresh" size={13} /> Refresh</button>
          <button className="btn btn-sm" onClick={() => window.print()}><Icon name="printer" size={13} /> Print</button>
          {user && user.rank >= 2 && <button className="btn btn-sm" onClick={async () => {
            const url = api.exportUrl('xlsx', filters)
            const token = api.getToken()
            const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            const blob = await res.blob()
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mva_analytics_report.xlsx'; a.click()
          }}><Icon name="download" size={13} /> Export Excel</button>}
        </div>
      </div>

      <div className="kpi-hero-grid">
        <div className="kpi-hero reveal">
          <div className="kh-top">
            <div>
              <div className="kpi-label">Total students</div>
              <div className="kh-value"><AnimatedNumber value={ov.total_students} /></div>
              <div className="kh-meta">
                <span className={`delta ${ov.yoy_growth >= 0 ? 'up' : 'down'}`}>
                  {ov.yoy_growth >= 0 ? '▲' : '▼'} {Math.abs(ov.yoy_growth)}% YoY
                </span>
                <span>across {ov.yearly.length} academic years</span>
              </div>
            </div>
            <div className="kh-badge"><Icon name="users" size={18} /></div>
          </div>
          <div className="kh-spark">
            {ov.yearly.map((y, i) => (
              <i key={y.year} style={{ height: `${Math.max(8, (y.students / maxYear) * 100)}%`, animationDelay: `${i * 90}ms` }} title={`${y.year}: ${y.students.toLocaleString('en-IN')}`} />
            ))}
          </div>
          <div className="kh-foot">
            <span>{ov.yearly[0]?.year ?? '—'} → {ov.yearly.at(-1)?.year ?? '—'}</span>
            <span>{ov.total_students.toLocaleString('en-IN')} records analysed</span>
          </div>
        </div>
        <div className="kpi-stack">
          <KpiCard compact label={`${ov.current_year} registrations`} value={ov.current_year_students} icon={<Icon name="chart" size={13} />}
            foot={<span style={{ color: growthColor(ov.yoy_growth) }}>{ov.yoy_growth >= 0 ? '▲' : '▼'} {Math.abs(ov.yoy_growth)}% vs {ov.previous_year}</span>} index={1} />
          <KpiCard compact label="Year-over-year growth" value={ov.yoy_growth} icon={<Icon name="trend" size={13} />}
            decimals={1} suffix="%" foot={`${ov.previous_year_students.toLocaleString('en-IN')} → ${ov.current_year_students.toLocaleString('en-IN')}`} index={2} />
          <KpiCard compact label={`${fc.next_year ?? ov.current_year + 1} forecast`} value={fc.next_year_predicted ?? 0} icon={<Icon name="sparkles" size={13} />}
            foot={<span className="pill blue">ESTIMATE</span>} index={3} />
        </div>
      </div>

      <div className="stat-strip reveal">
        <div className="stat-item"><div className="stat-label">States / regions</div><div className="stat-value">{ov.states_count}</div><div className="stat-foot">geographical reach</div></div>
        <div className="stat-item"><div className="stat-label">Districts</div><div className="stat-value">{ov.districts_count}</div><div className="stat-foot">represented</div></div>
        <div className="stat-item"><div className="stat-label">Cities</div><div className="stat-value">{ov.cities_count}</div><div className="stat-foot">distinct locations</div></div>
        <div className="stat-item"><div className="stat-label">Countries</div><div className="stat-value">{ov.countries_count}</div><div className="stat-foot">Indian &amp; overseas</div></div>
        <div className="stat-item"><div className="stat-label">5-year growth</div><div className="stat-value" style={{ color: growthColor(ov.five_year_growth) }}>{ov.five_year_growth}%</div><div className="stat-foot" style={{ textTransform: 'capitalize' }}>{ov.trend} trend</div></div>
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
          <CountryDonut data={ov.top_countries} height={320} />
        </div>
      </div>

      <div className="section-head reveal">
        <div><h2>Rankings</h2><p>Sortable tables with share of total</p></div>
        <button className="btn btn-sm" onClick={() => navigate('geography')}>Full geographical analysis <Icon name="arrowRight" size={13} /></button>
      </div>
      <div className="grid two-col">
        <RankTable data={ov.top_states} title="Top 10 States" />
        <RankTable data={topCities} title="Top 10 Cities" />
      </div>

      <div className="grid two-col" style={{ marginTop: 14 }}>
        <div className="card reveal">
          <h3 className="card-title">Admission Status</h3>
          <p className="card-sub">Distribution within the selection</p>
          <BarDistribution data={ov.status_distribution} horizontal height={210} color="#9747ff" max={6} />
        </div>
        <div className="card reveal">
          <h3 className="card-title">Class Applied For</h3>
          <p className="card-sub">Students by class/grade</p>
          <BarDistribution data={ov.class_distribution} horizontal height={210} color="#0d99ff" max={7} />
        </div>
      </div>

      <div className="card reveal" style={{ marginTop: 14 }}>
        <h3 className="card-title">Data Quality Snapshot</h3>
        <p className="card-sub">Automatic validation of the selected records</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 34, fontWeight: 650, letterSpacing: '-.035em', color: quality && quality.score >= 95 ? 'var(--green)' : 'var(--amber)' }}>
            {quality ? <AnimatedNumber value={quality.score} suffix="%" /> : '—'}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ height: 6, background: 'var(--surface-tint)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${quality?.score ?? 0}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width .9s cubic-bezier(.2,.8,.2,1)' }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-500)', margin: '7px 0 0' }}>
              {quality?.records_with_issues ?? 0} of {quality?.total_records ?? 0} records flagged · status: {quality?.status || '—'}
            </p>
          </div>
          <button className="btn btn-sm" onClick={() => navigate('quality')}>View detailed report <Icon name="arrowRight" size={13} /></button>
        </div>
      </div>
    </>
  )
}
