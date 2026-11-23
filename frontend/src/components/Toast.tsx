import { createContext, useCallback, useContext, useState } from 'react'

type Tone = 'success' | 'error' | 'info'
interface Toast { id: number; message: string; tone: Tone }
interface Ctx { push: (message: string, tone?: Tone) => void }

const ToastCtx = createContext<Ctx>({ push: () => undefined })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, tone }])
    window.setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.tone}`} role="status">
            <span>{t.tone === 'success' ? '✓' : t.tone === 'error' ? '⚠' : '✦'}</span>
            <span>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
