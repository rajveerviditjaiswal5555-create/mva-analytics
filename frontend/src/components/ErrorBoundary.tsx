import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

/** Keeps a rendering failure from leaving the user with a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MVA Analytics UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20,
          background: 'var(--surface-soft)', color: 'var(--ink-900)' }}>
          <div className="card" style={{ maxWidth: 520, textAlign: 'center' }}>
            <div style={{ fontSize: 38 }}>⚠</div>
            <h2 style={{ margin: '10px 0 8px' }}>Something went wrong</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.6 }}>
              The dashboard could not be displayed. Your data is safe — reload the page to try again.
            </p>
            <pre style={{ fontSize: 10, textAlign: 'left', overflow: 'auto', background: 'var(--surface-soft)',
              padding: 10, borderRadius: 8, color: 'var(--ink-500)' }}>{this.state.error.message}</pre>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload application</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
