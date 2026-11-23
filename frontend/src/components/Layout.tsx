import { useEffect, useState } from 'react'
import type { AuthUser, Page } from '../types'
import { setToken } from '../api'

interface Props {
  page: Page
  onNavigate: (page: Page) => void
  user: AuthUser | null
  onLogout: () => void
  isDemo: boolean
  title: string
  subtitle: string
  busy?: boolean
  children: React.ReactNode
}

const NAV: Array<{ page: Page; icon: string; label: string; group: string; minRank?: number }> = [
  { page: 'dashboard', icon: '◈', label: 'Dashboard', group: 'ANALYTICS' },
  { page: 'geography', icon: '⬡', label: 'Geographical Analytics', group: 'ANALYTICS' },
  { page: 'years', icon: '▤', label: 'Year-wise Analysis', group: 'ANALYTICS' },
  { page: 'forecast', icon: '◇', label: 'Future Predictions', group: 'ANALYTICS' },
  { page: 'simulator', icon: '⇄', label: 'What-If Simulator', group: 'ANALYTICS' },
  { page: 'students', icon: '☰', label: 'Student Search', group: 'DATA', minRank: 2 },
  { page: 'quality', icon: '✓', label: 'Data Quality', group: 'DATA' },
  { page: 'admin', icon: '⚙', label: 'Admin Panel', group: 'SYSTEM', minRank: 3 },
]

export function DemoBanner({ onNavigate, compact = false }: { onNavigate?: (p: Page) => void; compact?: boolean }) {
  return (
    <div className="demo-banner" style={compact ? { marginBottom: 14 } : undefined}>
      <span className="badge">DEMO</span>
      <span>DEMO DATA — Synthetic records for demonstration only. No record represents a real student of Macro Vision Academy.</span>
      {onNavigate && <a className="banner-link" onClick={() => onNavigate('admin')} style={{ cursor: 'pointer' }}>Upload official data →</a>}
    </div>
  )
}

/** Attaches an IntersectionObserver to every .reveal element so it fades in on scroll. */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal:not(.visible)')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08 })
    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default function Layout({ page, onNavigate, user, onLogout, isDemo, title, subtitle, busy, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('mva_theme') === 'dark')
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('mva_theme', dark ? 'dark' : 'light')
  }, [dark])

  const navigate = (p: Page) => { onNavigate(p); setMenuOpen(false) }
  const rank = user?.rank ?? 0

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-crest">M</div>
          <div>
            <div className="brand-title">Macro Vision Academy</div>
            <div className="brand-sub">Entrance Analytics</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {['ANALYTICS', 'DATA', 'SYSTEM'].map(group => (
            <div key={group}>
              <div className="nav-label">{group}</div>
              {NAV.filter(item => item.group === group && (item.minRank === undefined || rank >= item.minRank)).map(item => (
                <button key={item.page} className={`nav-item ${page === item.page ? 'active' : ''}`} onClick={() => navigate(item.page)}>
                  <span className="ico">{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="owner">Macro Vision Academy</div>
          Burhanpur, Madhya Pradesh, India<br />
          <span style={{ opacity: .7 }}>v1.0 · Analytics Platform</span>
        </div>
      </aside>

      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 35 }} />}

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">☰</button>
            <div className="page-heading">{title}<small>{subtitle}</small></div>
          </div>
          <div className="topbar-right">
            <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? '☀' : '☾'}</button>
            <button className="icon-btn" onClick={() => navigate('landing')} title="Public website">🌐</button>
            <div className="user-chip">
              <div className="avatar">{(user?.full_name || 'G').slice(0, 1).toUpperCase()}</div>
              <div className="user-meta">
                <strong>{user?.full_name || 'Guest'}</strong>
                <span>{user?.role?.replace('_', ' ') || 'Not signed in'}</span>
              </div>
              <button className="btn btn-sm" onClick={() => setConfirmLogout(true)}>Sign out</button>
            </div>
          </div>
        </header>
        {busy && <div className="top-progress" aria-hidden="true"><span /></div>}
        <main className="content">
          {isDemo && <DemoBanner onNavigate={navigate} />}
          {children}
        </main>
      </div>

      {confirmLogout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,28,51,.6)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 18 }}
          onClick={() => setConfirmLogout(false)}>
          <div className="card" style={{ width: 'min(380px,100%)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Sign out?</h3>
            <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: '0 0 18px' }}>Your authenticated session will be ended.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmLogout(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setToken(null); setConfirmLogout(false); onLogout() }}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
