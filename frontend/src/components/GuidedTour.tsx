import { useState } from 'react'

const STEPS = [
  { title: 'Welcome to Student Analytics', text: 'This dashboard is computed live from the database. Every number, ranking and chart updates when you change filters.' },
  { title: 'Use the filters', text: 'Filter by year, state, district, city, country and more. Your filters are saved in the URL so you can bookmark and share this exact view.' },
  { title: 'Explore the sections', text: 'Open Geographical Analytics for the India map, Performance for entrance scores, Forecast for validated predictions, and Admin Panel to manage data.' },
]

export default function GuidedTour() {
  const [step, setStep] = useState(() => localStorage.getItem('mva_tour_done') ? -1 : 0)
  if (step < 0) return null

  const close = () => { localStorage.setItem('mva_tour_done', '1'); setStep(-1) }
  const current = STEPS[step]

  return (
    <div className="tour-tip" style={{ right: 24, top: 96 }}>
      <h4>{current.title}</h4>
      <p>{current.text}</p>
      <div className="tour-actions">
        <div className="tour-dots">{STEPS.map((_, i) => <i key={i} className={i === step ? 'active' : ''} />)}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={close}>Skip</button>
          <button className="btn btn-sm btn-primary" onClick={() => step === STEPS.length - 1 ? close() : setStep(step + 1)}>
            {step === STEPS.length - 1 ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
