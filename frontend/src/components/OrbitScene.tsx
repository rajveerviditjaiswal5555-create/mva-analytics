import { useEffect, useRef } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

type OrbitPlanet = {
  label: string
  sub: string
  icon: IconName
  color: string
  radius: number
  size: number
  speed: number
  phase: number
  moons: string[]
}

const PLANETS: OrbitPlanet[] = [
  { label: 'Groq', sub: 'inference cloud', icon: 'zap', color: '#fb923c', radius: 92, size: 46, speed: 0.17, phase: 0.4, moons: ['Qwen 3.8 27B', 'Llama 3.3'] },
  { label: 'OpenAI', sub: 'language models', icon: 'sparkles', color: '#34d399', radius: 143, size: 39, speed: -0.12, phase: 2.1, moons: ['GPT-4o', 'o3'] },
  { label: 'Anthropic', sub: 'reasoning models', icon: 'sparkles', color: '#f0c75e', radius: 190, size: 33, speed: 0.09, phase: 3.7, moons: ['Claude 3.7'] },
  { label: 'Google', sub: 'multimodal', icon: 'globe', color: '#60a5fa', radius: 228, size: 29, speed: -0.07, phase: 5.2, moons: ['Gemini 2.5'] },
]

const STARS = Array.from({ length: 44 }, (_, i) => {
  const a = Math.sin(i * 127.1) * 43758.5453
  const b = Math.sin(i * 311.7) * 24634.6345
  return {
    left: (a - Math.floor(a)) * 100,
    top: (b - Math.floor(b)) * 100,
    size: 1 + (i % 3) * 0.6,
    delay: (i % 8) * 0.37,
  }
})

interface Props {
  onSelect: () => void
  stats: { years: number; students: number; regions: number }
}

/** CSS/JS 3D orbit system: MVA crest as the sun, feature planets with orbiting moons. */
export default function OrbitScene({ onSelect, stats }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const systemRef = useRef<HTMLDivElement>(null)
  const nodes = useRef<Array<HTMLDivElement | null>>([])
  const moons = useRef<Array<Array<HTMLSpanElement | null>>>([])
  const drag = useRef({ active: false, x: 0, rot: 0, tilt: 0.42 })
  const clock = useRef(0)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const el = sceneRef.current
      if (el && systemRef.current) {
        const scale = Math.min(1.12, el.clientWidth / 460)
        systemRef.current.style.setProperty('--scene-scale', String(scale))
      }
    }
    const observer = new ResizeObserver(resize)
    if (sceneRef.current) observer.observe(sceneRef.current)
    resize()

    const frame = (now: number) => {
      const dt = Math.min(40, now - last)
      last = now
      if (!reduced) clock.current += dt / 1000
      const t = clock.current
      const { rot, tilt } = drag.current

      PLANETS.forEach((planet, i) => {
        const node = nodes.current[i]
        if (!node) return
        const angle = planet.phase + t * planet.speed + rot
        const px = Math.cos(angle) * planet.radius
        const pz = Math.sin(angle) * planet.radius
        const py = pz * Math.sin(tilt)
        const depth = pz * Math.cos(tilt)
        const scale = 1 + depth / (planet.radius * 2.8)
        node.style.setProperty('--x', `${px.toFixed(1)}px`)
        node.style.setProperty('--y', `${py.toFixed(1)}px`)
        node.style.setProperty('--s', scale.toFixed(3))
        node.style.zIndex = String(Math.round(100 + depth))

        planet.moons.forEach((_, j) => {
          const moon = moons.current[i]?.[j]
          if (!moon) return
          const ma = angle * 1.7 + t * 0.95 + j * 2.4
          const mr = planet.size / 2 + 11 + j * 7
          moon.style.setProperty('--mx', `${(Math.cos(ma) * mr).toFixed(1)}px`)
          moon.style.setProperty('--my', `${(Math.sin(ma) * mr * 0.52).toFixed(1)}px`)
          moon.style.setProperty('--ms', (1 + 0.12 * Math.sin(ma)).toFixed(2))
        })
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  const onDown = (e: React.PointerEvent) => {
    drag.current.active = true
    drag.current.x = e.clientX
  }
  const onMove = (e: React.PointerEvent) => {
    if (drag.current.active) {
      drag.current.rot += (e.clientX - drag.current.x) * 0.008
      drag.current.x = e.clientX
    } else {
      const r = sceneRef.current?.getBoundingClientRect()
      if (r) drag.current.tilt = 0.42 + ((e.clientY - r.top) / r.height - 0.5) * 0.16
    }
  }
  const onUp = () => { drag.current.active = false }

  return (
    <div className="orbit-scene" ref={sceneRef} onPointerDown={onDown} onPointerMove={onMove}
      onPointerUp={onUp} onPointerLeave={onUp} aria-label="Interactive 3D data universe">
      <div className="orbit-stars" aria-hidden="true">
        {STARS.map((s, i) => (
          <i key={i} className="orbit-star" style={{
            left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size,
            animationDelay: `${s.delay}s`,
          }} />
        ))}
      </div>

      <div className="orbit-system" ref={systemRef}>
        {PLANETS.map(p => (
          <div key={`ring-${p.label}`} className="orbit-ring" style={{
            width: `${p.radius * 2}px`,
            height: `${p.radius * 2 * Math.sin(0.42)}px`,
          }} />
        ))}

        <div className="orbit-sun" aria-hidden="true"><span>M</span></div>

        {PLANETS.map((p, i) => (
          <div key={p.label} className="orbit-node" ref={el => { nodes.current[i] = el }}
            style={{ ['--color' as string]: p.color, width: p.size, height: p.size }}>
            <button className="orbit-planet" onClick={onSelect} title={`${p.label} — open analytics`}>
              <Icon name={p.icon} size={Math.round(p.size / 3)} />
            </button>
            <span className="orbit-label"><b>{p.label}</b><small>{p.sub}</small></span>
            {p.moons.map((moon, j) => (
              <span key={moon} className="orbit-moon" title={moon}
                ref={el => { (moons.current[i] ||= [])[j] = el }}
                style={{ ['--moon-size' as string]: `${5 + j * 2}px` }} />
            ))}
          </div>
        ))}
      </div>

      <div className="orbit-caption">
        <span><b>{stats.years}</b> years</span>
        <span><b>{stats.students.toLocaleString('en-IN')}</b> records</span>
        <span><b>{stats.regions}</b> regions</span>
        <span className="orbit-caption-hint">drag to orbit</span>
      </div>
    </div>
  )
}
