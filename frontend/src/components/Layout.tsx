import { useEffect, useRef, useState } from 'react'
import type { AuthUser, Page } from '../types'
import { setToken } from '../api'
import GuidedTour from './GuidedTour'
import Icon from './Icon'
import type { IconName } from './Icon'

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

const NAV: Array<{ page: Page; icon: IconName; label: string; group: string; minRank?: number }> = [
  { page: 'dashboard', icon: 'dashboard', label: 'Dashboard', group: 'ANALYTICS' },
  { page: 'geography', icon: 'map', label: 'Geographical Analytics', group: 'ANALYTICS' },
  { page: 'years', icon: 'chart', label: 'Year-wise Analysis', group: 'ANALYTICS' },
  { page: 'performance', icon: 'star', label: 'Entrance Performance', group: 'ANALYTICS' },
  { page: 'forecast', icon: 'trend', label: 'Future Predictions', group: 'ANALYTICS' },
  { page: 'simulator', icon: 'swap', label: 'What-If Simulator', group: 'ANALYTICS' },
  { page: 'students', icon: 'search', label: 'Student Search', group: 'DATA', minRank: 2 },
  { page: 'quality', icon: 'shield', label: 'Data Quality', group: 'DATA' },
  { page: 'admin', icon: 'settings', label: 'Admin Panel', group: 'SYSTEM', minRank: 3 },
]

/** Fades in .reveal elements on scroll. Watches for elements added after data loads. */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.05 })

    let frame = 0
    const scan = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el))
      })
    }
    scan()

    const root = document.getElementById('root')
    const mutations = root ? new MutationObserver(scan) : null
    mutations?.observe(root!, { childList: true, subtree: true })

    // A fast scroll can jump straight past an element without the observer firing.
    // Treat anything at or above the viewport bottom as revealed so it can never stay hidden.
    const onScroll = () => {
      document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight + 40) {
          el.classList.add('visible')
          observer.unobserve(el)
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      mutations?.disconnect()
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default function Layout({ page, onNavigate, user, onLogout, isDemo, title, subtitle, busy, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('mva_theme') !== 'light')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  useReveal([])
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('mva_theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const navigate = (p: Page) => { onNavigate(p); setMenuOpen(false) }
  const rank = user?.rank ?? 0
  const needle = query.trim().toLowerCase()
  const visible = NAV.filter(item =>
    (item.minRank === undefined || rank >= item.minRank) &&
    (!needle || item.label.toLowerCase().includes(needle) || item.group.toLowerCase().includes(needle)))

  return (
    <div className="app-shell or-mode">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-crest">M</div>
          <div>
            <div className="brand-title">Macro Vision</div>
            <div className="brand-sub">Academy · Analytics</div>
          </div>
        </div>

        <div className="sidebar-search">
          <Icon name="search" size={14} />
          <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pages…" aria-label="Search pages" />
          <kbd>⌘K</kbd>
        </div>

        <nav className="sidebar-nav">
          {['ANALYTICS', 'DATA', 'SYSTEM'].map(group => {
            const items = visible.filter(item => item.group === group)
            if (!items.length) return null
            return (
              <div key={group}>
                <div className="nav-label">{group}</div>
                {items.map(item => (
                  <button key={item.page} className={`nav-item ${page === item.page ? 'active' : ''}`} onClick={() => navigate(item.page)}>
                    <span className="ico"><Icon name={item.icon} size={15} /></span>
                    {item.label}
                  </button>
                ))}
              </div>
            )
          })}
          {visible.length === 0 && <div className="empty">No matching page</div>}
        </nav>

        <div className="sidebar-footer">
          <div className="team-row">
            <div className="avatar">{(user?.full_name || 'G').slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="owner">{user?.full_name || 'Guest'}</div>
              <div style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ') || 'Not signed in'}</div>
            </div>
          </div>
          Burhanpur, Madhya Pradesh, India<br />
          <span style={{ opacity: .7 }}>v1.0 · Analytics Platform</span>
        </div>
      </aside>

      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 35 }} />}

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu"><Icon name="menu" size={16} /></button>
            <div className="breadcrumb" title={subtitle}>
              <span className="crumb-root">Macro Vision Academy</span>
              <Icon name="chevron" size={12} className="crumb-sep" />
              <strong className="crumb-current">{title}</strong>
            </div>
          </div>
          <div className="topbar-right">
            {isDemo && <button className="demo-pill" title="Synthetic demonstration records — not actual Macro Vision Academy students" onClick={() => navigate('admin')}>DEMO DATA</button>}
            <span className="live-badge"><i className="pulse-dot" /> Live</span>
            <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle theme" aria-label="Toggle theme"><Icon name={dark ? 'sun' : 'moon'} size={14} /></button>
            <button className="icon-btn" onClick={() => navigate('landing')} title="Public website" aria-label="Public website"><Icon name="globe" size={14} /></button>
            <div className="user-chip">
              <div className="avatar">{(user?.full_name || 'G').slice(0, 1).toUpperCase()}</div>
              <div className="user-meta">
                <strong>{user?.full_name || 'Guest'}</strong>
                <span>{user?.role?.replace('_', ' ') || 'Not signed in'}</span>
              </div>
              <button className="icon-btn" onClick={() => setConfirmLogout(true)} title="Sign out" aria-label="Sign out"><Icon name="logout" size={14} /></button>
            </div>
          </div>
        </header>
        {busy && <div className="top-progress" role="status" aria-label="Loading data"><span /></div>}
        <main className="content page-enter" key={page}>
          {children}
        </main>
        {page === 'dashboard' && <GuidedTour />}
      </div>

      {confirmLogout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 18 }}
          onClick={() => setConfirmLogout(false)}>
          <div className="card" style={{ width: 'min(360px,100%)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>Sign out?</h3>
            <p style={{ fontSize: 11.5, color: 'var(--ink-500)', margin: '0 0 16px' }}>Your authenticated session will be ended.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={() => setConfirmLogout(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={() => { setToken(null); setConfirmLogout(false); onLogout() }}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
