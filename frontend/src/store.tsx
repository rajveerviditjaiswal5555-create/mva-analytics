import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser, FilterOption, Insight, Overview, Page, QualityReport } from './types'
import { api, getToken } from './api'

interface AppState {
  page: Page
  navigate: (page: Page) => void
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  authLoading: boolean
  filters: Record<string, string>
  setFilters: (f: Record<string, string>) => void
  options: FilterOption | null
  overview: Overview | null
  insights: Insight[]
  quality: QualityReport | null
  loading: boolean
  fetchBusy: boolean
  error: string
  refresh: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

const PAGES: Page[] = [
  'landing', 'login', 'dashboard', 'geography', 'years', 'performance',
  'forecast', 'simulator', 'students', 'quality', 'admin',
]

function parseHash(): { page: Page; filters: Record<string, string> } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [pathPart = '', queryPart = ''] = raw.split('?')
  const page = (PAGES.includes(pathPart.toLowerCase() as Page) ? pathPart.toLowerCase() : 'landing') as Page
  const filters: Record<string, string> = {}
  new URLSearchParams(queryPart).forEach((value, key) => { filters[key] = value })
  return { page, filters }
}

function hashFor(page: Page, filters: Record<string, string>): string {
  if (page === 'landing') return ''
  const query = new URLSearchParams(filters).toString()
  return `#/${page}${query ? `?${query}` : ''}`
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const initial = parseHash()
  const [page, setPage] = useState<Page>(initial.page)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [filters, setFiltersState] = useState<Record<string, string>>(initial.filters)
  const [options, setOptions] = useState<FilterOption | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [quality, setQuality] = useState<QualityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchBusy, setFetchBusy] = useState(false)
  const [error, setError] = useState('')

  const navigate = useCallback((p: Page) => {
    setPage(p)
    window.location.hash = hashFor(p, filters)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filters])

  const setFilters = useCallback((next: Record<string, string>) => {
    setFiltersState(next)
    window.location.hash = hashFor(page, next)
  }, [page])

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash()
      setPage(parsed.page)
      setFiltersState(parsed.filters)
      window.scrollTo(0, 0)
    }
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
      api.me()
        .then(res => { if (res.authenticated && res.user) setUser(res.user) })
        .catch(() => undefined)
        .finally(() => setAuthLoading(false))
    } else {
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    const onFetch = (e: Event) => setFetchBusy((e as CustomEvent<{ pending: number }>).detail.pending > 0)
    window.addEventListener('mva:fetch', onFetch)
    return () => window.removeEventListener('mva:fetch', onFetch)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const value = useMemo<AppState>(() => ({
    page, navigate, user, setUser, authLoading, filters, setFilters, options,
    overview, insights, quality, loading, fetchBusy, error, refresh,
  }), [page, navigate, user, authLoading, filters, options, overview, insights, quality, loading, fetchBusy, error, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
