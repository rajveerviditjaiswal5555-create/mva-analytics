import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../api'
import Filters from '../components/Filters'
import AnimatedNumber from '../components/AnimatedNumber'
import { BarDistribution, DonutChart, MultiLineChart } from '../components/Charts'
import type { PerformanceReport } from '../types'

export default function Performance() {
  const { filters, setFilters, options } = useApp()
  const [report, setReport] = useState<PerformanceReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.performance(filters).then(setReport).catch(() => undefined).finally(() => setLoading(false))
  }, [filters])

  if (loading && !report) return <div className="loading"><div className="spinner" />Analysing entrance performance…</div>
  if (!report?.available) return <div className="empty">No scored records in the current selection.</div>

  const s = report.summary

  return (
    <>
      <Filters options={options} filters={filters} onChange={setFilters} />
      <div className="section-head">
        <div><h2>Entrance Performance Analytics</h2><p>Score distributions, regional performance and admission outcomes — computed from the selected records</p></div>
      </div>

      <div className="grid kpi-grid">
        {[
          { label: 'Average Entrance Score', value: s.average_entrance_score },
          { label: 'Median Score', value: s.median_entrance_score },
          { label: 'Highest Score', value: s.top_score },
          { label: 'Average Entrance %', value: s.average_percentage, suffix: '%' },
          { label: 'Average Previous %', value: s.average_previous_percentage, suffix: '%' },
          { label: 'Scores Analysed', value: s.scores_analyzed },
          { label: 'Admission Rate', value: s.admission_rate, suffix: '%' },
        ].map((k, i) => (
          <div className="kpi" key={k.label} style={{ animation: `fadeUp .4s ${i * 45}ms both` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value"><AnimatedNumber value={k.value} decimals={1} suffix={k.suffix || ''} /></div>
          </div>
        ))}
      </div>

      <div className="grid chart-grid" style={{ marginTop: 18 }}>
        <div className="card">
          <h3 className="card-title">Entrance Score Distribution</h3>
          <p className="card-sub">Number of students in each score band</p>
          <BarDistribution data={report.score_bands} height={320} color="#2563eb" max={10} />
        </div>
        <div className="card">
          <h3 className="card-title">Admission Outcome</h3>
          <p className="card-sub">Admission status breakdown</p>
          <DonutChart data={report.admission_funnel} height={320} max={6} />
        </div>
        <div className="card">
          <h3 className="card-title">Top States by Average Score</h3>
          <p className="card-sub">States with the strongest entrance performance</p>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>#</th><th>State</th><th style={{ textAlign: 'right' }}>Students</th><th style={{ textAlign: 'right' }}>Avg score</th><th style={{ textAlign: 'right' }}>Admitted</th></tr></thead>
              <tbody>{report.by_state.slice(0, 12).map((r, i) => (
                <tr key={r.state}><td><span className={`rank-badge ${i < 3 ? 'top' : ''}`}>{i + 1}</span></td>
                  <td>{r.state}</td><td className="num">{r.students.toLocaleString('en-IN')}</td>
                  <td className="num"><strong>{r.average_score}</strong></td>
                  <td className="num">{r.admission_rate}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3 className="card-title">Performance by Class Applied For</h3>
          <p className="card-sub">Average entrance and previous academic percentage</p>
          <MultiLineChart
            data={report.class_performance.map(c => ({ name: c.class_applied.replace('Class ', ''), score: c.average_score, percentage: c.average_percentage }))}
            height={320}
            series={[
              { key: 'score', name: 'Avg entrance score', color: '#2563eb' },
              { key: 'percentage', name: 'Avg percentage', color: '#c9a227' },
            ]}
            valueFormatter={v => String(Math.round(v))}
          />
        </div>
      </div>

      <div className="section-head"><div><h2>Additional Breakdowns</h2><p>Where performance varies across school type and referral source</p></div></div>
      <div className="grid two-col">
        <div className="card">
          <h3 className="card-title">School Type</h3>
          <BarDistribution data={report.school_type_performance.map(x => ({ name: x.school_type, students: x.students, percentage: x.average_score }))} horizontal height={250} color="#0d9488" max={8} />
        </div>
        <div className="card">
          <h3 className="card-title">Referral Source</h3>
          <BarDistribution data={report.source_performance.map(x => ({ name: x.source_referral, students: x.students, percentage: x.average_score }))} horizontal height={250} color="#7c3aed" max={8} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 className="card-title">Top Cities by Entrance Score</h3>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>#</th><th>City</th><th style={{ textAlign: 'right' }}>Students</th><th style={{ textAlign: 'right' }}>Avg score</th></tr></thead>
          <tbody>{report.by_city.slice(0, 15).map((c, i) => <tr key={c.city}>
            <td><span className={`rank-badge ${i < 3 ? 'top' : ''}`}>{i + 1}</span></td>
            <td>{c.city}</td><td className="num">{c.students.toLocaleString('en-IN')}</td>
            <td className="num"><strong>{c.average_score}</strong></td></tr>)}</tbody>
        </table></div>
      </div>
    </>
  )
}
