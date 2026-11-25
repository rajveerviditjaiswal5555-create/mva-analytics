import type {
  AuthUser, CompareReport, CountryInfo, FilterOption, Insight, Overview,
  PerformanceReport, QualityReport, StateInfo, StudentRecord, YearPoint,
} from './types'

const TOKEN_KEY = 'mva_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

let pending = 0
function setPending(delta: number) {
  pending = Math.max(0, pending + delta)
  window.dispatchEvent(new CustomEvent('mva:fetch', { detail: { pending } }))
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  setPending(1)
  const token = getToken()
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) }
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    const response = await fetch(path, { ...options, headers })
    if (!response.ok) {
      let message = `Request failed (${response.status})`
      try {
        const data = await response.json()
        message = data.detail || message
      } catch { /* ignore */ }
      if (response.status === 401 && !path.includes('/auth/login')) setToken(null)
      throw new Error(message)
    }
    return await response.json() as T
  } finally {
    setPending(-1)
  }
}

function query(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}

export const api = {
  aiStatus: () => request<{ available: boolean }>('/api/ai/status'),
  aiSuggestions: () => request<{ suggested: string[] }>('/api/ai/suggestions'),
  aiAsk: (message: string, filters: Record<string, string | number | undefined>, history: Array<{ role: string; content: string }>) =>
    request<{ answer: string; suggested: string[]; available: boolean }>('/api/ai/ask', {
      method: 'POST', body: JSON.stringify({ message, filters, history }),
    }),

  getToken,
  setToken,
  health: () => request<{ status: string }>('/api/health'),

  login: (username: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ status: string }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ authenticated: boolean; user?: AuthUser }>('/api/auth/me'),

  overview: (filters: Record<string, string | number | undefined>) =>
    request<Overview>(`/api/analytics/overview${query(filters)}`),
  insights: (filters: Record<string, string | number | undefined>) =>
    request<{ insights: Insight[] }>(`/api/analytics/insights${query(filters)}`),
  quality: (filters: Record<string, string | number | undefined>) =>
    request<QualityReport>(`/api/analytics/data-quality${query(filters)}`),
  states: (filters: Record<string, string | number | undefined>) =>
    request<{ total: number; states: StateInfo[] }>(`/api/analytics/states${query(filters)}`),
  countries: (filters: Record<string, string | number | undefined>) =>
    request<{ total: number; countries: CountryInfo[] }>(`/api/analytics/countries${query(filters)}`),
  years: (filters: Record<string, string | number | undefined>) =>
    request<{ years: YearPoint[]; total: number }>(`/api/analytics/years${query(filters)}`),
  cities: (filters: Record<string, string | number | undefined>) =>
    request<{ cities: Array<{ name: string; students: number; percentage: number }> }>(`/api/analytics/cities${query(filters)}`),
  performance: (filters: Record<string, string | number | undefined>) =>
    request<PerformanceReport>(`/api/analytics/performance${query(filters)}`),
  compare: (filters: Record<string, string | number | undefined>, year1?: number, year2?: number) =>
    request<CompareReport>(`/api/analytics/compare${query({ ...filters, year1, year2 })}`),
  filterOptions: (filters: Record<string, string | number | undefined> = {}) =>
    request<FilterOption>(`/api/analytics/filter-options${query(filters)}`),
  forecast: (filters: Record<string, string | number | undefined>, horizon = 10) =>
    request<Overview['forecast']>(`/api/analytics/forecast${query({ ...filters, horizon })}`),
  whatIf: (filters: Record<string, string | number | undefined>, growth: number, horizon = 5) =>
    request<{
      current: number
      current_year: number
      what_if: { growth_pct: number; current: number; points: Array<{ year_offset: number; students: number; is_forecast: boolean }> }
      scenarios: Record<string, Array<{ year_offset: number; students: number; is_forecast: boolean }>>
      data_mode: string
    }>(`/api/analytics/what-if${query({ ...filters, growth, horizon })}`),
  stateForecast: (filters: Record<string, string | number | undefined>, state = '', horizon = 5) =>
    request<{
      available: boolean
      selected: StateInfo
      forecast: Overview['forecast']
      fastest_growing: Array<{ state: string; students: number; growth: number; trend: string }>
      declining: Array<{ state: string; students: number; growth: number; trend: string }>
      stable: Array<{ state: string; students: number; growth: number; trend: string }>
      states: Array<{ state: string; students: number }>
    }>(`/api/analytics/state-forecast${query({ ...filters, state, horizon })}`),

  searchStudents: (search: string, filters: Record<string, string | number | undefined>, page = 1) =>
    request<{ total: number; page: number; pages: number; results: StudentRecord[]; is_demo: boolean }>(
      `/api/students/search${query({ ...filters, q: search, page, page_size: 25 })}`
    ),

  importPreview: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<{
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
    }>('/api/admin/import/preview', { method: 'POST', body })
  },
  importConfirm: (stagingId: number, replaceDemo: boolean) =>
    request<{ imported: number; data_mode: string }>('/api/admin/import/confirm', {
      method: 'POST', body: JSON.stringify({ staging_id: stagingId, replace_demo: replaceDemo }),
    }),
  importHistory: () => request<Array<Record<string, unknown>>>('/api/admin/import/history'),
  regenerateDemo: () => request<{ generated: number }>('/api/admin/demo/regenerate', { method: 'POST' }),
  clearDemo: () => request<{ removed: number }>('/api/admin/demo/clear', { method: 'DELETE' }),
  adminStudents: (page = 1) => request<{ total: number; pages: number; records: Array<Record<string, unknown>> }>(
    `/api/admin/students${query({ page, page_size: 25 })}`
  ),
  deleteStudent: (id: number) => request<{ status: string }>(`/api/admin/students/${id}`, { method: 'DELETE' }),
  users: () => request<Array<Record<string, unknown>>>('/api/admin/users'),
  createUser: (data: Record<string, string>) => request<{ id: number }>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Record<string, unknown>) => request<{ status: string }>(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<{ status: string }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  auditLogs: () => request<Array<Record<string, unknown>>>('/api/admin/audit-logs'),
  settings: () => request<Record<string, string>>('/api/admin/settings'),
  saveSettings: (values: Record<string, string>) => request<{ status: string }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(values) }),
  exportUrl: (format: string, filters: Record<string, string | number | undefined>) =>
    `/api/admin/export${query({ ...filters, format })}`,
}
