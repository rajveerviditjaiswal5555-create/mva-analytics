import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider, useApp } from './store'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import LoadingSkeleton from './components/LoadingSkeleton'
import Assistant from './components/Assistant'
import Backdrop from './components/Backdrop'

document.documentElement.setAttribute('data-theme', localStorage.getItem('mva_theme') === 'light' ? 'light' : 'dark')
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Geography from './pages/Geography'
import Years from './pages/Years'
import Performance from './pages/Performance'
import ForecastPage from './pages/Forecast'
import Simulator from './pages/Simulator'
import StudentsPage from './pages/Students'
import Quality from './pages/Quality'
import Admin from './pages/Admin'
import { api } from './api'
import type { Page } from './types'
import './styles.css'

const META: Record<Page, { title: string; subtitle: string }> = {
  landing: { title: '', subtitle: '' },
  login: { title: 'Sign In', subtitle: 'Administrator access' },
  dashboard: { title: 'Student Analytics', subtitle: 'Entrance analytics overview' },
  geography: { title: 'Geographical Analytics', subtitle: 'States, cities and countries' },
  years: { title: 'Year-wise Analysis', subtitle: 'Five-year registration comparison' },
  performance: { title: 'Entrance Performance', subtitle: 'Scores, admission and regional outcomes' },
  forecast: { title: 'Future Predictions', subtitle: 'Validated statistical forecasting' },
  simulator: { title: 'What-If Simulator', subtitle: 'Growth / decline scenario planning' },
  students: { title: 'Student Search', subtitle: 'Authorised student-level lookup' },
  quality: { title: 'Data Quality', subtitle: 'Automatic validation report' },
  admin: { title: 'Administrator Panel', subtitle: 'Data, users and system settings' },
}

function Router() {
  const { page, navigate, user, setUser, authLoading, overview, loading, fetchBusy } = useApp()

  useEffect(() => {
    document.title = `${META[page].title ? META[page].title + ' | ' : ''}Macro Vision Academy`
    document.documentElement.setAttribute('data-theme', localStorage.getItem('mva_theme') === 'light' ? 'light' : 'dark')
  }, [page])

  if (page === 'landing') return <Landing onLogin={() => navigate(user ? 'dashboard' : 'login')} />
  if (page === 'login') return <Login />

  if (authLoading) return <div className="loading"><div className="spinner" />Restoring your session…</div>

  const requireAuth = ['students', 'admin'].includes(page) && !user
  if (requireAuth) return <Login />

  const content = (() => {
    switch (page) {
      case 'dashboard': return <Dashboard />
      case 'geography': return <Geography />
      case 'years': return <Years />
      case 'performance': return <Performance />
      case 'forecast': return <ForecastPage />
      case 'simulator': return <Simulator />
      case 'students': return <StudentsPage />
      case 'quality': return <Quality />
      case 'admin': return <Admin />
      default: return <Dashboard />
    }
  })()

  return (
    <Layout page={page} onNavigate={navigate} user={user} isDemo={!!overview?.is_demo}
      onLogout={() => setUser(null)} title={META[page].title} subtitle={META[page].subtitle} busy={loading || fetchBusy}>
      {loading && !overview ? <LoadingSkeleton /> : content}
    </Layout>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Backdrop />
      <ToastProvider>
        <AppProvider>
          <Router />
          <Assistant />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

// Keep the session valid by refreshing it silently when the tab regains focus.
window.addEventListener('focus', () => {
  if (api.getToken()) api.me().catch(() => undefined)
})
