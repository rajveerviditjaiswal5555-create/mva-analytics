import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { api } from '../api'
import Filters from '../components/Filters'
import type { StudentRecord } from '../types'

export default function StudentsPage() {
  const { filters, setFilters, options, user } = useApp()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    total: number; page: number; pages: number; results: StudentRecord[]; is_demo: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    api.searchStudents(query, filters, page)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [query, filters, page])

  if (user && user.rank < 2) return <div className="empty">Your role does not permit access to student-level records.</div>

  return (
    <>
      <Filters options={options} filters={filters} onChange={f => { setFilters(f); setPage(1) }} />
      <div className="section-head">
        <div><h2>Student Search</h2><p>Search by student ID, application ID, name, city, state, country, year or class</p></div>
      </div>

      <div className="card">
        <div className="field" style={{ maxWidth: 520 }}>
          <label>Search records</label>
          <input className="input" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="Try: MVA2026, APP-, Burhanpur, Madhya Pradesh, Class 10…" />
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-500)', margin: '9px 0 0' }}>
          {data ? <><strong>{data.total.toLocaleString('en-IN')}</strong> matching records · page {data.page} of {data.pages}</> : 'Searching across the active dataset…'}
          {user && <> · accessed by <strong>{user.username}</strong> (audit logged)</>}
        </p>
      </div>

      {error && <div className="login-error">⚠ {error}</div>}

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? <div className="loading"><div className="spinner" />Searching…</div> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr>
                <th>Student ID</th><th>Application ID</th><th>Name</th><th>Gender</th><th>Class</th>
                <th>Year</th><th>City</th><th>State</th><th>Country</th><th>Score</th><th>%</th><th>Status</th>
              </tr></thead>
              <tbody>
                {data?.results.length === 0 && <tr><td colSpan={12} className="empty">No records match your search and filters.</td></tr>}
                {data?.results.map(r => (
                  <tr key={r.id}>
                    <td className="mono">{r.student_id}</td>
                    <td className="mono">{r.application_id}</td>
                    <td style={{ fontWeight: 600 }}>{r.full_name} {r.is_synthetic && <span className="pill amber">SYNTHETIC</span>}</td>
                    <td>{r.gender}</td><td>{r.class_applied}</td><td>{r.year}</td>
                    <td>{r.city}</td><td>{r.state}</td><td>{r.country}</td>
                    <td className="num">{r.entrance_score ?? '—'}</td>
                    <td className="num">{r.percentage ?? '—'}</td>
                    <td><span className={`pill ${r.admission_status === 'Admitted' ? 'green' : r.admission_status === 'Not Admitted' ? 'red' : 'amber'}`}>{r.admission_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
            <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>Page {page} of {data.pages}</span>
            <button className="btn btn-sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
      <div className="note" style={{ marginTop: 14 }}>
        🔒 Student-level data is available only to ANALYST, SCHOOL ADMIN and SUPER ADMIN roles. All search activity is recorded in the audit log.
      </div>
    </>
  )
}
