import { useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'

export default function Login() {
  const { navigate, setUser } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await api.login(username, password)
      api.setToken(res.token)
      setUser(res.user)
      navigate('dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally { setBusy(false) }
  }

  const quick = (u: string, p: string) => { setUsername(u); setPassword(p) }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-crest">M</div>
        <h2>Administrator Sign In</h2>
        <p className="sub">Macro Vision Academy · Analytics Platform</p>
        {error && <div className="login-error">⚠ {error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Username</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="superadmin" autoComplete="username" required /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required /></div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 6 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign In →'}</button>
        </form>
        <div className="demo-creds">
          <strong>Demo credentials (change in production):</strong>
          <code onClick={() => quick('superadmin', 'Admin@MVA2026!')} style={{ cursor: 'pointer' }}>superadmin / Admin@MVA2026! — SUPER ADMIN</code>
          <code onClick={() => quick('schooladmin', 'School@MVA2026!')} style={{ cursor: 'pointer' }}>schooladmin / School@MVA2026! — SCHOOL ADMIN</code>
          <code onClick={() => quick('analyst', 'Analyst@MVA2026!')} style={{ cursor: 'pointer' }}>analyst / Analyst@MVA2026! — ANALYST</code>
          <code onClick={() => quick('viewer', 'Viewer@MVA2026!')} style={{ cursor: 'pointer' }}>viewer / Viewer@MVA2026! — VIEWER</code>
          <div style={{ marginTop: 12 }}><button className="btn btn-sm" onClick={() => navigate('landing')}>← Back to public website</button></div>
        </div>
      </div>
    </div>
  )
}
