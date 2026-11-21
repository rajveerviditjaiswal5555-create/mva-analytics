import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../api'
import Filters from '../components/Filters'
import { ForecastChart, MultiLineChart } from '../components/Charts'
import AnimatedNumber from '../components/AnimatedNumber'
import type { Overview, StateInfo } from '../types'

export default function ForecastPage() {
  const { filters, setFilters, options, overview } = useApp()
  const [stateName, setStateName] = useState('')
  const [stateForecast, setStateForecast] = useState<Awaited<ReturnType<typeof api.stateForecast>> | null>(null)
  const [states, setStates] = useState<StateInfo[]>([])
  const [horizon, setHorizon] = useState(10)
  const [forecastData, setForecastData] = useState<Overview['forecast'] | null>(null)

  const fc = forecastData ?? overview?.forecast
  const historical = overview?.yearly || []
  const lastActualYear = historical.at(-1)?.year ?? 2026

  useEffect(() => {
    api.forecast(filters, horizon).then(setForecastData).catch(() => undefined)
  }, [filters, horizon, overview])

  useEffect(() => {
    api.states(filters).then(res => setStates(res.states)).catch(() => undefined)
  }, [filters, overview])

  useEffect(() => {
    api.stateForecast(filters, stateName, 5).then(setStateForecast).catch(() => undefined)
  }, [filters, stateName, overview])

  const confidenceData = (fc?.points || []).filter(p => p.is_forecast).map(p => ({
    name: String(p.year), predicted: p.predicted ?? 0,
    lower: p.lower ?? 0, upper: p.upper ?? 0,
  }))

  return (
    <>
      <Filters options={options} filters={filters} onChange={setFilters} />
      <div className="section-head">
        <div><h2>Future Prediction System</h2><p>Statistical estimates derived from historical registrations · never guaranteed numbers</p></div>
        <div className="field" style={{ width: 130 }}><label>Horizon</label>
          <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}>
            {[3, 5, 10, 15, 20].map(h => <option key={h} value={h}>{h} years</option>)}
          </select>
        </div>
      </div>

      <div className="demo-banner" style={{ background: 'linear-gradient(90deg,#1e3a8a,#4338ca)' }}>
        <span className="badge">ESTIMATE</span>
        <span>All predictions on this page are statistical projections. They are not confirmed or guaranteed registration figures.</span>
      </div>

      {!fc || !fc.available ? (
        <div className="empty">Forecast requires at least two years of data. Current selection: {historical.length} year(s).</div>
      ) : (
        <>
          <div className="grid kpi-grid">
            {[
              { label: 'Next Year', year: fc.next_year, value: fc.next_year_predicted },
              { label: 'In 2 Years', year: (fc.next_year ?? 0) + 1, value: fc.points.find(p => p.year === (fc.next_year ?? 0) + 1)?.predicted },
              { label: 'In 3 Years', year: (fc.next_year ?? 0) + 2, value: fc.forecast_3y },
              { label: 'In 5 Years', year: (fc.next_year ?? 0) + 4, value: fc.forecast_5y },
              { label: 'In 10 Years', year: (fc.next_year ?? 0) + 9, value: fc.forecast_10y },
            ].map((item, i) => (
              <div className="kpi" key={item.label} style={{ animation: `fadeUp .4s ${i * 50}ms both` }}>
                <div className="kpi-label">{item.label} · {item.year}</div>
                <div className="kpi-value">{item.value != null ? <AnimatedNumber value={item.value} /> : '—'}</div>
                <div className="kpi-foot"><span className="pill amber">ESTIMATE</span></div>
              </div>
            ))}
          </div>

          <div className="grid chart-grid" style={{ marginTop: 18 }}>
            <div className="card">
              <h3 className="card-title">Historical Trend + Forecast</h3>
              <p className="card-sub">{fc.method} · solid = actual, dashed = estimate</p>
              <ForecastChart points={fc.points} height={340} />
            </div>
            <div className="card">
              <h3 className="card-title">Confidence / Uncertainty Range</h3>
              <p className="card-sub">Approximate ± interval from historical residuals</p>
              <MultiLineChart data={confidenceData} height={340}
                series={[
                  { key: 'predicted', name: 'Predicted', color: '#c9a227' },
                  { key: 'lower', name: 'Lower bound', color: '#93c5fd', dashed: true },
                  { key: 'upper', name: 'Upper bound', color: '#93c5fd', dashed: true },
                ]} />
            </div>
          </div>

          <div className="grid two-col" style={{ marginTop: 16 }}>
            <div className="card">
              <h3 className="card-title">Forecast Validation</h3>
              <p className="card-sub">{fc.validation?.note}</p>
              <div className="grid kpi-grid" style={{ marginBottom: 12 }}>
                <div className="kpi"><div className="kpi-label">MAE</div><div className="kpi-value">{fc.validation?.mae ?? '—'}</div></div>
                <div className="kpi"><div className="kpi-label">RMSE</div><div className="kpi-value">{fc.validation?.rmse ?? '—'}</div></div>
                <div className="kpi"><div className="kpi-label">MAPE</div><div className="kpi-value">{fc.validation?.mape ?? '—'}{fc.validation?.mape != null ? '%' : ''}</div></div>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Year</th><th style={{ textAlign: 'right' }}>Actual</th><th style={{ textAlign: 'right' }}>Forecast</th><th style={{ textAlign: 'right' }}>Error</th><th style={{ textAlign: 'right' }}>Error %</th></tr></thead>
                  <tbody>{(fc.validation?.details || []).map(d => (
                    <tr key={d.year}><td>{d.year}</td><td className="num">{d.actual.toLocaleString('en-IN')}</td>
                      <td className="num">{d.forecast.toLocaleString('en-IN')}</td>
                      <td className="num">{d.error >= 0 ? '+' : ''}{d.error}</td>
                      <td className="num">{d.error_pct != null ? `${d.error_pct >= 0 ? '+' : ''}${d.error_pct}%` : '—'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="note" style={{ marginTop: 12 }}>{fc.explanation} Historical CAGR: <strong>{fc.historical_cagr_pct}%</strong> per year.</div>
            </div>
            <div className="card">
              <h3 className="card-title">Full Forecast Table</h3>
              <p className="card-sub">Actual values end at {lastActualYear}; everything below is an estimate</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Year</th><th style={{ textAlign: 'right' }}>Actual</th><th style={{ textAlign: 'right' }}>Predicted</th><th style={{ textAlign: 'right' }}>Range</th></tr></thead>
                  <tbody>{fc.points.map(p => (
                    <tr key={p.year} style={{ opacity: p.is_forecast ? .85 : 1 }}>
                      <td>{p.year} {p.is_forecast && <span className="pill amber">EST</span>}</td>
                      <td className="num">{p.actual != null ? p.actual.toLocaleString('en-IN') : '—'}</td>
                      <td className="num">{p.predicted != null ? <strong>{Math.round(p.predicted).toLocaleString('en-IN')}</strong> : '—'}</td>
                      <td className="num">{p.lower != null ? `${Math.round(p.lower).toLocaleString('en-IN')} – ${Math.round(p.upper!).toLocaleString('en-IN')}` : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="section-head"><div><h2>State-wise Future Prediction</h2><p>Select a state to view its individual projection</p></div></div>
      <div className="card">
        <div className="field" style={{ maxWidth: 320, marginBottom: 16 }}>
          <label>Select state</label>
          <select value={stateName} onChange={e => setStateName(e.target.value)}>
            <option value="">Leading state (default)</option>
            {states.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
          </select>
        </div>
        {stateForecast?.selected && (
          <>
            <div className="grid kpi-grid" style={{ marginBottom: 14 }}>
              {[
                { label: 'Current Students', value: stateForecast.selected.students },
                { label: 'Share', value: stateForecast.selected.percentage, suffix: '%', decimals: 1 },
                { label: 'Long-term Growth', value: stateForecast.selected.growth, suffix: '%', decimals: 1 },
                { label: 'Predicted Next Year', value: stateForecast.forecast?.next_year_predicted ?? 0 },
                { label: 'Predicted 3 Years', value: stateForecast.forecast?.forecast_3y ?? 0 },
                { label: 'Predicted 5 Years', value: stateForecast.forecast?.forecast_5y ?? 0 },
              ].map((k, i) => <div className="kpi" key={k.label} style={{ animation: `fadeUp .4s ${i * 45}ms both` }}>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value"><AnimatedNumber value={k.value} decimals={k.decimals || 0} suffix={k.suffix || ''} /></div>
              </div>)}
            </div>
            <div className="grid three-col">
              {[
                { title: 'Fastest Growing', items: stateForecast.fastest_growing, tone: 'green' },
                { title: 'Declining Fastest', items: stateForecast.declining, tone: 'red' },
                { title: 'Stable', items: stateForecast.stable, tone: 'blue' },
              ].map(group => <div key={group.title}>
                <h4 style={{ fontSize: 12, margin: '0 0 8px' }}>{group.title}</h4>
                <div className="table-wrap"><table className="data">
                  <thead><tr><th>State</th><th style={{ textAlign: 'right' }}>Growth</th></tr></thead>
                  <tbody>{group.items.length ? group.items.map(s => <tr key={s.state}><td>{s.state}</td>
                    <td className="num"><span className={`pill ${group.tone}`}>{s.growth >= 0 ? '+' : ''}{s.growth}%</span></td></tr>) : <tr><td colSpan={2} className="empty">None</td></tr>}</tbody>
                </table></div>
              </div>)}
            </div>
          </>
        )}
      </div>
    </>
  )
}
