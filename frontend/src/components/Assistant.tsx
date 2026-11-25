import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useApp } from '../store'

interface Msg { role: 'user' | 'assistant'; content: string }

const QUICK = [
  'Which state contributes the most students?',
  'What is the forecast for next year?',
  'How accurate is the forecast?',
  'Which regions are growing fastest?',
]

export default function Assistant() {
  const { filters } = useApp()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { api.aiStatus().then(r => setAvailable(r.available)).catch(() => undefined) }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || busy) return
    setMessages(prev => [...prev, { role: 'user', content: message }])
    setInput('')
    setBusy(true)
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const r = await api.aiAsk(message, filters, history)
      setMessages(prev => [...prev, { role: 'assistant', content: r.answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry — ${err instanceof Error ? err.message : 'could not reach the assistant'}.` }])
    } finally { setBusy(false) }
  }

  return (
    <>
      <button className="assistant-fab" onClick={() => setOpen(!open)} aria-label="AI assistant" title="AI Assistant">
        {open ? '✕' : '✦'}
      </button>
      {open && (
        <div className="assistant-panel" role="dialog" aria-label="AI Analytics Assistant">
          <div className="assistant-head">
            <div className="assistant-avatar">✦</div>
            <div>
              <strong>AI Analytics Assistant</strong>
              <span><i className="pulse-dot" style={{ marginRight: 6 }} />{available ? 'Online · grounded in your data' : 'Not configured'}</span>
            </div>
            <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <div className="assistant-body">
            {messages.length === 0 && (
              <div className="assistant-welcome">
                <p>Ask me about registrations, states, growth or forecasts. I only use aggregated data from the current selection.</p>
                <div className="assistant-quick">
                  {QUICK.map(q => <button key={q} className="btn btn-sm" onClick={() => send(q)}>{q}</button>)}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg ${m.role}`}>
                <div className="assistant-bubble">{m.content}</div>
              </div>
            ))}
            {busy && <div className="assistant-msg assistant"><div className="assistant-bubble typing"><i /><i /><i /></div></div>}
            <div ref={endRef} />
          </div>
          <div className="assistant-foot">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(input) }}
              placeholder="Ask a question…"
              disabled={busy}
            />
            <button className="btn btn-primary btn-sm" onClick={() => send(input)} disabled={busy || !input.trim()}>Send</button>
          </div>
          <div className="assistant-note">Answers are generated from aggregated analytics · DEMO figures are synthetic · forecasts are estimates</div>
        </div>
      )}
    </>
  )
}
