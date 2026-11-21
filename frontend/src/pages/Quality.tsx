import { useApp } from '../store'
import Filters from '../components/Filters'
import AnimatedNumber from '../components/AnimatedNumber'
import type { Insight } from '../types'

export default function QualityPage() {
  const { quality, overview, filters, setFilters, options, insights } = useApp()
  const q = quality
  const score = q?.score ?? 0
  const color = score >= 95 ? 'var(--green)' : score >= 85 ? 'var(--amber)' : 'var(--red)'

  return (
    <>
      <Filters options={options} filters={filters} onChange={setFilters} />
      <div className="section-head">
        <div><h2>Data Quality</h2><p>Automatic checks run before analytics · results reflect the active filters</p></div>
      </div>

      <div className="grid two-col">
        <div className="card">
          <h3 className="card-title">Data Quality Score</h3>
          <p className="card-sub">Percentage of records with no detected issues</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 150, height: 150 }}>
              <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-tint)" strokeWidth="11" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 326.7} 326.7`}
                  style={{ transition: 'stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color }}><AnimatedNumber value={score} suffix="%" /></div>
                <div style={{ fontSize: 10, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: 1 }}>{q?.status ?? '—'}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div className="kpi-label">Records analysed</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}><AnimatedNumber value={q?.total_records ?? 0} /></div>
              <div className="kpi-label" style={{ marginTop: 12 }}>Records with issues</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)' }}><AnimatedNumber value={q?.records_with_issues ?? 0} /></div>
              <div className="kpi-label" style={{ marginTop: 12 }}>Clean records</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}><AnimatedNumber value={(q?.total_records ?? 0) - (q?.records_with_issues ?? 0)} /></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Validation Breakdown</h3>
          <p className="card-sub">Missing values · duplicates · invalid dates · impossible values</p>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Check</th><th style={{ textAlign: 'right' }}>Issues</th><th>Status</th></tr></thead>
              <tbody>{q?.breakdown.map(item => (
                <tr key={item.check}><td>{item.check}</td><td className="num">{item.issues.toLocaleString('en-IN')}</td>
                  <td><span className={`pill ${item.status === 'pass' ? 'green' : 'amber'}`}>{item.status === 'pass' ? 'PASS' : 'REVIEW'}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 className="card-title">Dataset Profile</h3>
        <p className="card-sub">Structural summary of the active selection</p>
        <div className="grid kpi-grid">
          {[
            { label: 'Total students', value: overview?.total_students ?? 0 },
            { label: 'States', value: overview?.states_count ?? 0 },
            { label: 'Countries', value: overview?.countries_count ?? 0 },
            { label: 'Cities', value: overview?.cities_count ?? 0 },
            { label: 'Districts', value: overview?.districts_count ?? 0 },
            { label: 'Years covered', value: overview?.yearly.length ?? 0 },
            { label: 'Avg. entrance score', value: overview?.performance.average_entrance_score ?? 0 },
            { label: 'Admission rate', value: overview?.performance.admission_rate ?? 0, suffix: '%' },
          ].map(item => <div className="kpi" key={item.label}>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-value"><AnimatedNumber value={item.value} suffix={item.suffix || ''} /></div>
          </div>)}
        </div>
        <div className="note" style={{ marginTop: 14 }}>
          {overview?.is_demo
            ? 'DEMO MODE: This profile describes synthetic demonstration records. No real student information is held in demo mode.'
            : 'OFFICIAL MODE: This profile describes data uploaded by an authorised administrator.'}
        </div>
      </div>

      <div className="section-head"><div><h2>Data-driven Insights</h2><p>Calculated from the current selection</p></div></div>
      <div className="insight-list">
        {(insights as Insight[]).map((ins, i) => <div className={`insight ${ins.tone}`} key={i}>
          <div className="insight-ico">•</div><span>{ins.text}</span>
        </div>)}
      </div>
    </>
  )
}
