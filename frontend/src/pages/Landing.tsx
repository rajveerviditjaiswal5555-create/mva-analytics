import { useEffect, useState } from 'react'
import { BarDistribution, GrowthChart } from '../components/Charts'
import { useReveal } from '../components/Layout'
import { api } from '../api'
import type { Overview } from '../types'
import AnimatedNumber from '../components/AnimatedNumber'
import OrbitScene3D from '../components/OrbitScene3D'

const FEATURES = [
  { icon: '◈', title: 'Entrance Analytics', text: 'Analyse registration trends across five academic years with every metric computed directly from the data.' },
  { icon: '⬡', title: 'Geographical Reach', text: 'Understand which states, districts, cities and countries contribute to the academy community.' },
  { icon: '◇', title: 'Future Forecasting', text: 'Validated statistical projections for the next 1, 3, 5 and 10 years — clearly labelled as estimates.' },
  { icon: '⇄', title: 'Scenario Planning', text: 'Compare optimistic, normal and declining growth scenarios with an interactive what-if simulator.' },
  { icon: '✓', title: 'Data Quality Checks', text: 'Automatic validation for missing values, duplicates, invalid dates and impossible figures.' },
  { icon: '⚿', title: 'Role-based Security', text: 'Protected administrative workflows with hashed passwords, audit logs and controlled data access.' },
]

export default function Landing({ onLogin }: { onLogin: () => void }) {
  const [ov, setOv] = useState<Overview | null>(null)
  const [orbitBodies, setOrbitBodies] = useState<Array<{ name: string; sub: string; moons: string[] }>>([])
  useReveal([ov])
  useEffect(() => { api.overview({}).then(setOv).catch(() => undefined) }, [])

  // Every state and country in the dataset becomes a planet; real districts/cities become moons.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [stateData, countryData] = await Promise.all([api.states({}), api.countries({})])
      const states = stateData.states || []
      const countries = countryData.countries || []
      const list = await Promise.all([
        ...states.map(async s => {
          let moons: string[] = []
          try {
            const options = await api.filterOptions({ state: s.state })
            moons = (options.districts || []).slice(0, 2).map(String)
          } catch { /* state still gets a planet */ }
          return { name: s.state, sub: `${s.students.toLocaleString('en-IN')} students · ${s.percentage}%`, moons }
        }),
        ...countries.map(async c => {
          let moons: string[] = []
          try {
            const options = await api.filterOptions({ country: c.country })
            moons = (options.cities || []).slice(0, 2).map(String)
          } catch { /* country still gets a planet */ }
          return { name: c.country, sub: `${c.students.toLocaleString('en-IN')} students · ${c.percentage}%`, moons }
        }),
      ])
      if (!cancelled) setOrbitBodies(list)
    }
    load().catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="landing or-mode">
      <nav className="lnav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div className="brand-crest">M</div>
          <div className="brand-title">Macro Vision Academy</div>
        </div>
        <div className="lnav-links">
          <a onClick={() => scrollTo('about')} style={{ cursor: 'pointer' }}>About</a>
          <a onClick={() => scrollTo('reach')} style={{ cursor: 'pointer' }}>Student Reach</a>
          <a onClick={() => scrollTo('growth')} style={{ cursor: 'pointer' }}>Growth</a>
          <a onClick={() => scrollTo('outlook')} style={{ cursor: 'pointer' }}>Future Outlook</a>
          <a onClick={() => scrollTo('contact')} style={{ cursor: 'pointer' }}>Contact</a>
        </div>
        <div className="lnav-actions">
          <button className="btn-ghost" onClick={onLogin}>Admin Login</button>
          <button className="btn-gold" onClick={onLogin}>Open Analytics →</button>
        </div>
      </nav>

      <header className="hero">
        <div>
          <span className="hero-badge">✦ Burhanpur · Madhya Pradesh · India</span>
          <h1>Student Entrance<br /><em>Analytics &amp; Forecasting</em></h1>
          <p className="lead">
            A data-driven window into five years of entrance registrations at Macro Vision Academy —
            revealing student reach, regional growth and what the future may hold.
          </p>
          <div className="hero-actions">
            <button className="btn btn-gold" onClick={onLogin}>Explore the Dashboard →</button>
            <button className="btn btn-ghost" onClick={() => scrollTo('about')}>Learn about the system</button>
          </div>
          <div className="hero-stats">
            <div><AnimatedNumber value={ov?.total_students ?? 0} /><small>Records analysed</small></div>
            <div><AnimatedNumber value={ov?.states_count ?? 0} /><small>States &amp; regions</small></div>
            <div><AnimatedNumber value={ov?.countries_count ?? 0} /><small>Countries</small></div>
            <div><AnimatedNumber value={ov?.cities_count ?? 0} /><small>Cities</small></div>
          </div>
        </div>
        <div className="hero-visual">
          <OrbitScene3D onSelect={onLogin} orbitBodies={orbitBodies} stats={{
            years: ov?.yearly?.length ?? 5,
            students: ov?.total_students ?? 0,
            regions: ov?.states_count ?? 0,
          }} />
        </div>
      </header>

      <section className="landing-section reveal" id="about">
        <div className="section-kicker">About the platform</div>
        <h2>Built for clarity, designed for decisions</h2>
        <p className="intro">
          The Macro Vision Academy Student Entrance Analytics System converts registration data into
          meaningful insight. It answers where students come from, how reach has changed over time and
          how registrations may evolve — using transparent, reproducible statistical methods.
        </p>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div className="feature reveal" key={f.title} style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="fico">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section alt" id="reach">
        <div className="section-kicker">Student reach</div>
        <h2>Where our students come from</h2>
        <p className="intro">Regional and international presence, shown as aggregated counts. Every figure below is generated from the active dataset.</p>
        <div className="reach-grid reveal">
          <div className="reach-panel">
            <h3 className="card-title">Top states by registrations</h3>
            <p className="card-sub">Share of total selected records</p>
            {ov && <BarDistribution data={ov.top_states} horizontal height={280} max={8} />}
          </div>
          <div className="reach-panel">
            <h3 className="card-title">Country-wise presence</h3>
            <p className="card-sub">Distribution across represented countries</p>
            {ov && <BarDistribution data={ov.top_countries} horizontal height={280} max={8} color="#0d9488" />}
          </div>
        </div>
      </section>

      <section className="landing-section" id="growth">
        <div className="section-kicker">Five-year growth</div>
        <h2>Registration trend over time</h2>
        <p className="intro">Year-over-year comparison computed as ((current − previous) / previous) × 100.</p>
        <div className="reach-panel reveal" style={{ marginTop: 26 }}>
          {ov && <GrowthChart data={ov.yearly} height={330} />}
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="data">
              <thead><tr><th>Year</th><th style={{ textAlign: 'right' }}>Students</th><th style={{ textAlign: 'right' }}>Change</th><th style={{ textAlign: 'right' }}>Growth %</th></tr></thead>
              <tbody>{ov?.yearly.map(y => (
                <tr key={y.year}><td style={{ fontWeight: 700 }}>{y.year}</td><td className="num">{y.students.toLocaleString('en-IN')}</td>
                  <td className="num">{y.change >= 0 ? '+' : ''}{y.change.toLocaleString('en-IN')}</td>
                  <td className="num"><span className={`pill ${y.growth >= 0 ? 'green' : 'red'}`}>{y.growth >= 0 ? '+' : ''}{y.growth}%</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="landing-section alt" id="outlook">
        <div className="section-kicker">Future outlook</div>
        <h2>Looking ahead — with honest uncertainty</h2>
        <p className="intro">
          Forecasts use a back-tested linear or exponential trend chosen automatically by predictive accuracy.
          All future values are estimates, never guarantees.
        </p>
        <div className="feature-grid reveal" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          {[
            { y: ov?.forecast.next_year, v: ov?.forecast.next_year_predicted, label: 'Next year' },
            { y: (ov?.forecast.next_year ?? 2026) + 2, v: ov?.forecast.forecast_3y, label: 'In 3 years' },
            { y: (ov?.forecast.next_year ?? 2026) + 4, v: ov?.forecast.forecast_5y, label: 'In 5 years' },
            { y: (ov?.forecast.next_year ?? 2026) + 9, v: ov?.forecast.forecast_10y, label: 'In 10 years' },
          ].map(item => (
            <div className="feature" key={item.label}>
              <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 10, letterSpacing: .8 }}>{item.label} · {item.y}</div>
              <div style={{ fontSize: 27, fontWeight: 650, letterSpacing: '-.035em', color: 'var(--ink-900)', marginTop: 6 }}>
                {item.v != null ? <AnimatedNumber value={item.v} /> : '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 4 }}>ESTIMATE · {ov?.forecast.method || '—'}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 10 }}>
        <div className="cta-band reveal">
          <h2>Explore the full analytics platform</h2>
          <p>Complete dashboards, geographical analysis, forecasting, simulations, search and secure administration.</p>
          <button className="btn btn-gold" onClick={onLogin}>Open Analytics Dashboard →</button>
        </div>
      </section>

      <footer className="footer" id="contact">
        <div className="footer-grid">
          <div>
            <h4>Macro Vision Academy</h4>
            Burhanpur, Madhya Pradesh, India<br />
            Student Entrance Analytics &amp; Forecasting System<br />
            <span style={{ opacity: .7 }}>Public area shows aggregated statistics only.</span>
          </div>
          <div><h4>Platform</h4>Dashboard<br />Geographical Analytics<br />Forecasting &amp; Simulation<br />Data Quality</div>
          <div><h4>Access</h4><button className="btn btn-sm btn-gold" onClick={onLogin}>Administrator Login</button><br /><span style={{ fontSize: 10, opacity: .7, display: 'block', marginTop: 8 }}>Authorised school staff only</span></div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 28, opacity: .6, fontSize: 11 }}>© {new Date().getFullYear()} Macro Vision Academy · Analytics Platform v1.0</div>
      </footer>
    </div>
  )
}
