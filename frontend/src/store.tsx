import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser, FilterOption, Insight, Overview, Page, QualityReport } from './types'
import { api, getToken } from './api'

interface AppState {
  page: Page
  navigate: (page: Page) => void
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  filters: Record<string, string>
  setFilters: (f: Record<string, string>) => void
  options: FilterOption | null
  overview: Overview | null
  insights: Insight[]
  quality: QualityReport | null
  loading: boolean
  error: string
  refresh: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

const PAGES: Page[] = [
  'landing', 'login', 'dashboard', 'geography', 'years', 'forecast',
  'simulator', 'students', 'quality', 'admin',
]

function pageFromHash(): Page {
  const value = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  return (PAGES.includes(value as Page) ? value : 'landing') as Page
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>(pageFromHash)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [options, setOptions] = useState<FilterOption | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [quality, setQuality] = useState<QualityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const navigate = useCallback((p: Page) => {
    setPage(p)
    window.location.hash = p === 'landing' ? '' : `#/${p}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onHashChange = () => { setPage(pageFromHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ov, ins, qual] = await Promise.all([
        api.overview(filters), api.insights(filters), api.quality(filters),
      ])
      setOverview(ov)
      setInsights(ins.insights)
      setQuality(qual)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    api.filterOptions().then(setOptions).catch(() => undefined)
    if (getToken()) {
      api.me().then(res => { if (res.authenticated && res.user) setUser(res.user) }).catch(() => undefined)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const value = useMemo<AppState>(() => ({
    page, navigate, user, setUser, filters, setFilters, options,
    overview, insights, quality, loading, error, refresh,
  }), [page, navigate, user, filters, options, overview, insights, quality, loading, error, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
