import { useEffect, useRef } from 'react'

/** Global motion layer: cursor glow, scroll progress, magnetic tilt and click ripples. */
export default function Motion() {
  const glowRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mx', `${e.clientX}px`)
        document.documentElement.style.setProperty('--my', `${e.clientY}px`)
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0
      if (progressRef.current) progressRef.current.style.width = `${pct}%`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.btn, .nav-item, .assistant-fab, .demo-pill') as HTMLElement | null
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const span = document.createElement('span')
      span.className = 'ripple'
      span.style.left = `${e.clientX - rect.left}px`
      span.style.top = `${e.clientY - rect.top}px`
      btn.appendChild(span)
      window.setTimeout(() => span.remove(), 650)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest('.tilt-card') as HTMLElement | null
      if (!card) return
      const r = card.getBoundingClientRect()
      const rx = ((e.clientY - r.top) / r.height - .5) * -8
      const ry = ((e.clientX - r.left) / r.width - .5) * 8
      card.style.setProperty('--rx', `${rx}deg`)
      card.style.setProperty('--ry', `${ry}deg`)
    }
    const onLeave = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest('.tilt-card') as HTMLElement | null
      card?.style.setProperty('--rx', '0deg')
      card?.style.setProperty('--ry', '0deg')
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseout', onLeave, { passive: true })
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [])

  return (
    <>
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <div ref={progressRef} className="scroll-progress" aria-hidden="true" />
    </>
  )
}
