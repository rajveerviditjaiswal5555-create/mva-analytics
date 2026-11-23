import { useEffect, useMemo, useState } from 'react'

interface Props {
  data: Array<{ name: string; students: number; percentage?: number }>
  height?: number
}

type Ring = number[][]
type Feature = { properties: { state: string }; geometry: { type: string; coordinates: unknown } }

let cachedGeo: Feature[] | null = null

const ALIASES: Record<string, string> = {
  Orissa: 'Odisha',
  Uttaranchal: 'Uttarakhand',
  'Andaman and Nicobar': 'Andaman and Nicobar Islands',
  Puducherry: 'Puducherry',
}

const normalize = (name: string) => ALIASES[name] || name

// Linear lon/lat projection covering mainland India + islands.
const LON_MIN = 67, LON_MAX = 98, LAT_MIN = 6, LAT_MAX = 36
const W = 480, H = 480
const project = (p: number[]) => [
  ((p[0] - LON_MIN) / (LON_MAX - LON_MIN)) * W,
  ((LAT_MAX - p[1]) / (LAT_MAX - LAT_MIN)) * H,
]

function ringToPath(ring: Ring): string {
  if (!ring.length) return ''
  const points = ring.map(project)
  return 'M' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z'
}

function geometryToPath(geom: Feature['geometry']): string {
  if (geom.type === 'Polygon') {
    return (geom.coordinates as Ring[]).map(ringToPath).join(' ')
  }
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates as Ring[][]).map(poly => poly.map(ringToPath).join(' ')).join(' ')
  }
  return ''
}

/** Lightweight SVG choropleth of India. GeoJSON is loaded once and cached. */
export default function IndiaMap({ data, height = 460 }: Props) {
  const [features, setFeatures] = useState<Feature[] | null>(cachedGeo)
  const [hover, setHover] = useState<{ name: string; x: number; y: number; students: number; percentage?: number } | null>(null)

  useEffect(() => {
    if (cachedGeo) return
    fetch('/india-states.geojson')
      .then(r => r.json())
      .then((json: { features: Feature[] }) => { cachedGeo = json.features; setFeatures(json.features) })
      .catch(() => undefined)
  }, [])

  const values = useMemo(() => {
    const map = new Map<string, { students: number; percentage?: number }>()
    data.forEach(d => map.set(normalize(d.name), { students: d.students, percentage: d.percentage }))
    return map
  }, [data])

  const max = Math.max(1, ...data.map(d => d.students))

  const shapes = useMemo(() => (features || []).map((feature, index) => {
    const name = normalize(feature.properties.state)
    const value = values.get(name)
    const ratio = value ? value.students / max : 0
    return {
      key: `${name}-${index}`,
      name,
      path: geometryToPath(feature.geometry),
      students: value?.students ?? 0,
      percentage: value?.percentage,
      hasData: !!value,
      fill: !value ? 'var(--surface-tint)' : `rgba(37, 99, 235, ${0.16 + ratio * 0.84})`,
    }
  }), [features, values, max])

  if (!features) {
    return <div className="loading"><div className="spinner" />Loading map…</div>
  }

  return (
    <div className="chart-enter" style={{ position: 'relative', width: '100%', height }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} role="img" aria-label="State-wise registration map of India">
        {shapes.map(shape => (
          <path
            key={shape.key}
            d={shape.path}
            fill={shape.fill}
            stroke="var(--surface)"
            strokeWidth={0.6}
            style={{ cursor: shape.hasData ? 'pointer' : 'default', transition: 'fill .2s, transform .2s', transformOrigin: 'center' }}
            onMouseMove={e => {
              if (!shape.hasData) return
              const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
              setHover({ name: shape.name, x: e.clientX - rect.left, y: e.clientY - rect.top, students: shape.students, percentage: shape.percentage })
            }}
            onMouseLeave={() => setHover(null)}
          >
            <title>{shape.hasData ? `${shape.name}: ${shape.students.toLocaleString('en-IN')} students` : `${shape.name}: no data`}</title>
          </path>
        ))}
      </svg>
      {hover && (
        <div style={{
          position: 'absolute', left: Math.min(hover.x + 14, 320),
          top: Math.max(hover.y - 40, 4),
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9,
          padding: '7px 10px', boxShadow: 'var(--shadow-md)', fontSize: 11, pointerEvents: 'none', zIndex: 5,
        }}>
          <strong>{hover.name}</strong><br />
          {hover.students.toLocaleString('en-IN')} students
          {hover.percentage != null && <> · {hover.percentage}%</>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--ink-500)', marginTop: 4 }}>
        <span>Low</span>
        <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'linear-gradient(90deg, rgba(37,99,235,.16), #2563eb)' }} />
        <span>High</span>
        <span style={{ marginLeft: 8 }}>Grey = no data in selection</span>
      </div>
    </div>
  )
}
