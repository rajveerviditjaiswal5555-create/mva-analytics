import { useState } from 'react'
import type { FilterOption } from '../types'

interface Props {
  options: FilterOption | null
  filters: Record<string, string>
  onChange: (filters: Record<string, string>) => void
  showRanges?: boolean
}

const FIELDS: Array<{ key: string; label: string; opt: keyof FilterOption }> = [
  { key: 'year', label: 'Academic Year', opt: 'years' },
  { key: 'state', label: 'State', opt: 'states' },
  { key: 'district', label: 'District', opt: 'districts' },
  { key: 'city', label: 'City', opt: 'cities' },
  { key: 'country', label: 'Country', opt: 'countries' },
  { key: 'gender', label: 'Gender', opt: 'genders' },
  { key: 'class_applied', label: 'Class', opt: 'classes' },
  { key: 'admission_status', label: 'Admission Status', opt: 'statuses' },
  { key: 'school_type', label: 'School Type', opt: 'school_types' },
]

export default function Filters({ options, filters, onChange, showRanges = true }: Props) {
  const [expanded, setExpanded] = useState(false)
  const activeCount = Object.values(filters).filter(v => v && v !== 'all').length

  const set = (key: string, value: string) => {
    const next = { ...filters }
    if (value) next[key] = value
    else delete next[key]
    onChange(next)
  }

  const visibleFields = expanded ? FIELDS : FIELDS.slice(0, 6)

  return (
    <div className="filter-bar">
      <div className="filter-bar-head">
        <strong>◈ Filters {activeCount > 0 && <span className="pill blue">{activeCount} active</span>}</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show less' : 'All filters'}</button>
          <button className="btn btn-sm" disabled={activeCount === 0} onClick={() => onChange({})}>Clear all</button>
        </div>
      </div>
      <div className="filters">
        {visibleFields.map(field => (
          <div className="field" key={field.key}>
            <label>{field.label}</label>
            <select value={filters[field.key] || ''} onChange={e => set(field.key, e.target.value)}>
              <option value="">All {field.label.toLowerCase()}s</option>
              {(options?.[field.opt] || []).map(value => (
                <option key={String(value)} value={String(value)}>{String(value)}</option>
              ))}
            </select>
          </div>
        ))}
        {expanded && showRanges && (
          <>
            <div className="field"><label>Score min</label><input type="number" placeholder="0" value={filters.score_min || ''} onChange={e => set('score_min', e.target.value)} /></div>
            <div className="field"><label>Score max</label><input type="number" placeholder="500" value={filters.score_max || ''} onChange={e => set('score_max', e.target.value)} /></div>
            <div className="field"><label>Percentage min</label><input type="number" placeholder="0" value={filters.percentage_min || ''} onChange={e => set('percentage_min', e.target.value)} /></div>
            <div className="field"><label>Percentage max</label><input type="number" placeholder="100" value={filters.percentage_max || ''} onChange={e => set('percentage_max', e.target.value)} /></div>
          </>
        )}
      </div>
      {activeCount > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 11 }}>
          {Object.entries(filters).filter(([, v]) => v).map(([key, value]) => (
            <span key={key} className="pill blue" style={{ cursor: 'pointer' }} onClick={() => set(key, '')}>
              {key.replace(/_/g, ' ')}: {value} ×
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
