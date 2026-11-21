import { useEffect, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'
import AnimatedNumber from '../components/AnimatedNumber'
import type { QualityReport } from '../types'

type Tab = 'overview' | 'import' | 'records' | 'users' | 'audit' | 'settings' | 'export'

interface PreviewData {
  staging_id: number
  filename: string
  total_records: number
  valid_records: number
  invalid_records: number
  duplicate_records: number
  missing_fields: Record<string, number>
  detected_columns: string[]
  column_mapping: Record<string, string>
  preview: Record<string, unknown>[]
  errors: string[]
}

export default function Admin() {
  const { user, overview, quality, refresh, navigate, filters } = useApp()
  const [tab, setTab] = useState<Tab>('overview')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [replaceDemo, setReplaceDemo] = useState(true)
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([])
  const [records, setRecords] = useState<{ total: number; pages: number; records: Array<Record<string, unknown>> } | null>(null)
  const [recordPage, setRecordPage] = useState(1)
  const [users, setUsers] = useState<Array<Record<string, any>>>([])
  const [audit, setAudit] = useState<Array<Record<string, any>>>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', password: '', role: 'ANALYST' })

  const load = async () => {
    try {
      const [h, u, a, s] = await Promise.all([
        api.importHistory(), api.users(), api.auditLogs(), api.settings(),
      ])
      setHistory(h); setUsers(u); setAudit(a); setSettings(s)
    } catch (err) { setError(err instanceof Error ? err.message : 'Load failed') }
  }

  useEffect(() => { load() }, [tab])

  if (!user || user.rank < 3) return <div className="empty">⚿ Administrator access required. <button className="btn btn-sm" onClick={() => navigate('login')}>Sign in</button></div>

  const wrap = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true); setError(''); setNotice('')
    try { await fn(); setNotice(message); await load(); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Operation failed') }
    finally { setBusy(false) }
  }

  const doPreview = () => {
    if (!file) return
    setBusy(true); setError(''); setNotice('')
    api.importPreview(file).then(data => { setPreview(data); setNotice('File validated. Review the preview before confirming.') })
      .catch(err => setError(err.message)).finally(() => setBusy(false))
  }

  const exportFile = async (format: string) => {
    setBusy(true)
    try {
      const url = api.exportUrl(format, filters)
      const res = await fetch(url, { headers: { Authorization: `Bearer ${api.getToken()}` } })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `mva_report_${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'}`
      a.click()
      setNotice(`${format.toUpperCase()} report downloaded.`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Export failed') }
    finally { setBusy(false) }
  }

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'overview', label: '◈ Overview' }, { key: 'import', label: '⬆ Data Import' },
    { key: 'records', label: '☰ Records' }, { key: 'users', label: '♙ Users' },
    { key: 'audit', label: '▤ Audit Logs' }, { key: 'settings', label: '⚙ Settings' },
    { key: 'export', label: '⤓ Export' },
  ]

  return (
    <>
      {error && <div className="login-error">⚠ {error}</div>}
      {notice && <div className="note" style={{ background: '#d1fae5', color: '#065f46' }}>✓ {notice}</div>}
      <div className="section-head">
        <div><h2>Administrator Panel</h2><p>Secure management console · signed in as {user.username} ({user.role.replace('_', ' ')})</p></div>
      </div>
      <div className="tabs">{TABS.map(t => <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}</div>

      {tab === 'overview' && (
        <>
          <div className="grid kpi-grid">
            {[
              { label: 'Data Mode', value: overview?.data_mode === 'demo' ? 1 : 0 },
              { label: 'Total Records', value: overview?.total_students ?? 0 },
              { label: 'Quality Score', value: quality?.score ?? 0, suffix: '%' },
              { label: 'Forecast Method', value: 1 },
            ].map((k, i) => <div className="kpi" key={k.label} style={{ animation: `fadeUp .4s ${i * 45}ms both` }}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: k.label === 'Data Mode' || k.label === 'Forecast Method' ? 17 : 27 }}>
                {k.label === 'Data Mode' ? (overview?.data_mode === 'demo' ? 'DEMO MODE' : 'OFFICIAL MODE')
                  : k.label === 'Forecast Method' ? (overview?.forecast.method || '—')
                  : <AnimatedNumber value={k.value} suffix={k.suffix || ''} />}
              </div>
            </div>)}
          </div>
          <div className="grid two-col" style={{ marginTop: 16 }}>
            <div className="card">
              <h3 className="card-title">Demo Data Management</h3>
              <p className="card-sub">Synthetic records are generated automatically when no official dataset is present.</p>
              <div className="note">Current mode: <strong>{overview?.data_mode?.toUpperCase()}</strong> · {overview?.total_students.toLocaleString('en-IN')} records loaded.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => wrap(() => api.regenerateDemo(), 'Demo dataset regenerated with 16,500 synthetic records.')}>↻ Regenerate demo data</button>
                {user.rank >= 4 && <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => wrap(() => api.clearDemo(), 'Synthetic records removed.')}>✕ Remove demo data</button>}
              </div>
            </div>
            <div className="card">
              <h3 className="card-title">Quick Actions</h3>
              <p className="card-sub">Common administrative tasks</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-sm" onClick={() => setTab('import')}>⬆ Upload official dataset</button>
                <button className="btn btn-sm" onClick={() => setTab('export')}>⤓ Generate &amp; download reports</button>
                <button className="btn btn-sm" onClick={() => setTab('users')}>♙ Manage users &amp; roles</button>
                <button className="btn btn-sm" onClick={() => setTab('audit')}>▤ Review audit log</button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'import' && (
        <>
          <div className="card">
            <h3 className="card-title">Upload Official Student Dataset</h3>
            <p className="card-sub">CSV or Excel (.csv, .xlsx) · max 25 MB · admin only</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="file" accept=".csv,.xlsx,.xlsm" onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null) }} />
              <button className="btn btn-primary btn-sm" disabled={!file || busy} onClick={doPreview}>{busy ? 'Validating…' : 'Validate & Preview →'}</button>
            </div>
            <div className="note" style={{ marginTop: 12 }}>
              Uploaded student personal information is never shown publicly. Data is staged first, validated, and only committed after your confirmation.
            </div>
          </div>

          {preview && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="card-title">Validation Report — {preview.filename}</h3>
              <p className="card-sub">Review before importing</p>
              <div className="grid kpi-grid">
                {[
                  { label: 'Total records', value: preview.total_records },
                  { label: 'Valid records', value: preview.valid_records },
                  { label: 'Invalid records', value: preview.invalid_records },
                  { label: 'Duplicate records', value: preview.duplicate_records },
                ].map((k, i) => <div className="kpi" key={k.label} style={{ animation: `fadeUp .4s ${i * 45}ms both` }}>
                  <div className="kpi-label">{k.label}</div><div className="kpi-value"><AnimatedNumber value={k.value} /></div>
                </div>)}
              </div>
              <div className="divider" />
              <h4 style={{ fontSize: 12, margin: '0 0 8px' }}>Detected column mapping</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(preview.column_mapping).map(([source, canonical]) => (
                  <span key={source} className="pill blue">{source} → {canonical}</span>
                ))}
              </div>
              {Object.keys(preview.missing_fields).length > 0 && (
                <>
                  <h4 style={{ fontSize: 12, margin: '14px 0 8px' }}>Missing fields</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(preview.missing_fields).map(([field, count]) => <span key={field} className="pill amber">{field}: {count}</span>)}
                  </div>
                </>
              )}
              {preview.errors.length > 0 && <div className="login-error" style={{ marginTop: 12 }}>{preview.errors.slice(0, 6).join(' · ')}</div>}
              <h4 style={{ fontSize: 12, margin: '14px 0 8px' }}>Preview (first 12 rows)</h4>
              <div className="table-wrap">
                <table className="data"><thead><tr>{Object.keys(preview.preview[0] || {}).slice(0, 10).map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>)}</tr></thead>
                  <tbody>{preview.preview.map((row, i) => <tr key={i}>{Object.keys(preview.preview[0] || {}).slice(0, 10).map(k => <td key={k}>{String(row[k] ?? '—')}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <div className="divider" />
              <label style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={replaceDemo} onChange={e => setReplaceDemo(e.target.checked)} />
                Remove existing synthetic demo records before importing
              </label>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" disabled={busy || preview.valid_records === 0}
                  onClick={() => wrap(() => api.importConfirm(preview.staging_id, replaceDemo), `${preview.valid_records} records imported successfully.`)}>
                  ✓ Confirm Import
                </button>
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="card-title">Import History</h3>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>File</th><th>Uploaded by</th><th style={{ textAlign: 'right' }}>Records</th><th style={{ textAlign: 'right' }}>Valid</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{history.length === 0 && <tr><td colSpan={6} className="empty">No imports yet</td></tr>}
                {history.map(h => <tr key={String(h.id)}><td>{String(h.filename)}</td><td>{String(h.uploaded_by)}</td>
                  <td className="num">{String(h.record_count)}</td><td className="num">{String(h.valid_count)}</td>
                  <td><span className={`pill ${h.status === 'imported' ? 'green' : 'amber'}`}>{String(h.status)}</span></td>
                  <td>{String(h.created_at).slice(0, 16).replace('T', ' ')}</td></tr>)}
              </tbody>
            </table></div>
          </div>
        </>
      )}

      {tab === 'records' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div><h3 className="card-title">Record Management</h3><p className="card-sub">{records?.total ?? 0} total records in the database</p></div>
            <button className="btn btn-sm" onClick={() => api.adminStudents(recordPage).then(setRecords)}>↻ Refresh</button>
          </div>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>ID</th><th>Student ID</th><th>Name</th><th>Year</th><th>State</th><th>City</th><th>Class</th><th>Status</th><th>Type</th><th></th></tr></thead>
            <tbody>{records?.records.map(r => <tr key={String(r.id)}>
              <td className="mono">{String(r.id)}</td><td className="mono">{String(r.student_id)}</td>
              <td>{String(r.full_name)}</td><td>{String(r.year)}</td><td>{String(r.state)}</td><td>{String(r.city)}</td>
              <td>{String(r.class_applied)}</td><td>{String(r.admission_status)}</td>
              <td>{r.is_synthetic ? <span className="pill amber">DEMO</span> : <span className="pill green">OFFICIAL</span>}</td>
              <td><button className="btn btn-sm btn-danger" disabled={busy}
                onClick={() => wrap(() => api.deleteStudent(Number(r.id)), 'Record deleted.')}>Delete</button></td>
            </tr>)}</tbody>
          </table></div>
          {records && records.pages > 1 && <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <button className="btn btn-sm" disabled={recordPage <= 1} onClick={() => { const p = recordPage - 1; setRecordPage(p); api.adminStudents(p).then(setRecords) }}>← Prev</button>
            <span style={{ fontSize: 12, padding: '6px' }}>Page {recordPage} / {records.pages}</span>
            <button className="btn btn-sm" disabled={recordPage >= records.pages} onClick={() => { const p = recordPage + 1; setRecordPage(p); api.adminStudents(p).then(setRecords) }}>Next →</button>
          </div>}
        </div>
      )}

      {tab === 'users' && (
        <>
          {user.rank >= 4 && <div className="card">
            <h3 className="card-title">Create User</h3>
            <p className="card-sub">Role-based access: VIEWER &lt; ANALYST &lt; SCHOOL ADMIN &lt; SUPER ADMIN</p>
            <div className="filters">
              <div className="field"><label>Username</label><input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} /></div>
              <div className="field"><label>Full name</label><input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} /></div>
              <div className="field"><label>Email</label><input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></div>
              <div className="field"><label>Password</label><input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} /></div>
              <div className="field"><label>Role</label><select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                {['VIEWER', 'ANALYST', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].map(r => <option key={r}>{r}</option>)}
              </select></div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} disabled={busy} onClick={() => wrap(async () => {
              await api.createUser(newUser); setNewUser({ username: '', email: '', full_name: '', password: '', role: 'ANALYST' })
            }, 'User created.')}>＋ Create User</button>
          </div>}
          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="card-title">User Management</h3>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last login</th>{user.rank >= 4 && <th></th>}</tr></thead>
              <tbody>{users.map(u => <tr key={String(u.id)}>
                <td className="mono">{String(u.username)}</td><td>{String(u.full_name)}</td><td>{String(u.email)}</td>
                <td><span className="pill blue">{String(u.role)}</span></td>
                <td>{u.is_active ? <span className="pill green">Yes</span> : <span className="pill red">No</span>}</td>
                <td>{u.last_login ? String(u.last_login).slice(0, 16).replace('T', ' ') : '—'}</td>
                {user.rank >= 4 && <td style={{ display: 'flex', gap: 5 }}>
                  <button className="btn btn-sm" onClick={() => wrap(() => api.updateUser(Number(u.id), { is_active: !u.is_active }), 'User status updated.')}>
                    {u.is_active ? 'Disable' : 'Enable'}</button>
                  <button className="btn btn-sm" onClick={() => {
                    const role = prompt('New role (VIEWER/ANALYST/SCHOOL_ADMIN/SUPER_ADMIN):', String(u.role))
                    if (role) wrap(() => api.updateUser(Number(u.id), { role }), 'Role updated.')
                  }}>Role</button>
                  <button className="btn btn-sm btn-danger" onClick={() => wrap(() => api.deleteUser(Number(u.id)), 'User deleted.')}>✕</button>
                </td>}
              </tr>)}</tbody>
            </table></div>
          </div>
        </>
      )}

      {tab === 'audit' && (
        <div className="card">
          <h3 className="card-title">Audit Log</h3>
          <p className="card-sub">Last 100 security-relevant actions</p>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>{audit.map(a => <tr key={String(a.id)}>
              <td>{String(a.created_at).slice(0, 19).replace('T', ' ')}</td>
              <td className="mono">{String(a.username)}</td>
              <td><span className="pill blue">{String(a.action)}</span></td>
              <td>{String(a.entity || '—')}</td><td>{String(a.details || '—')}</td>
            </tr>)}</tbody>
          </table></div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card">
          <h3 className="card-title">Dashboard Settings</h3>
          <p className="card-sub">Stored in the database and applied on reload</p>
          {Object.keys(settings).length === 0 && <div className="empty">No settings stored yet.</div>}
          <div className="filters">
            {Object.entries(settings).map(([key, value]) => <div className="field" key={key}>
              <label>{key.replace(/_/g, ' ')}</label>
              <input value={value} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />
            </div>)}
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} disabled={busy}
            onClick={() => wrap(() => api.saveSettings(settings), 'Settings saved.')}>Save Settings</button>
        </div>
      )}

      {tab === 'export' && (
        <>
          <div className="card">
            <h3 className="card-title">Export Reports &amp; Data</h3>
            <p className="card-sub">All exports respect the active analytics filters</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {Object.entries(filters).filter(([, v]) => v).length === 0
                ? <span className="pill gray">No filters active — full dataset</span>
                : Object.entries(filters).filter(([, v]) => v).map(([k, v]) =>
                  <span key={k} className="pill blue">{k.replace(/_/g, ' ')}: {v}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" disabled={busy} onClick={() => exportFile('csv')}>⤓ CSV Report</button>
              <button className="btn btn-sm" disabled={busy} onClick={() => exportFile('xlsx')}>⤓ Excel Report</button>
              <button className="btn btn-sm" disabled={busy} onClick={() => exportFile('pdf')}>⤓ PDF Report</button>
              <button className="btn btn-sm" disabled={busy} onClick={() => exportFile('students_csv')}>⤓ Student Records CSV</button>
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="card-title">Report Contents</h3>
            <p className="card-sub">Included in CSV / Excel / PDF reports</p>
            <ul style={{ fontSize: 12, lineHeight: 1.9, color: 'var(--ink-700)' }}>
              <li>Executive summary with total students, states, countries and cities</li>
              <li>State analysis with percentage share, growth and trend</li>
              <li>Country distribution and five-year trend</li>
              <li>Growth percentages and year-over-year change</li>
              <li>Validated forecast with MAE / RMSE / MAPE</li>
              <li>Automatically generated insights and data quality score</li>
              <li>Active filters and DEMO / OFFICIAL data mode notice</li>
            </ul>
          </div>
        </>
      )}
    </>
  )
}
