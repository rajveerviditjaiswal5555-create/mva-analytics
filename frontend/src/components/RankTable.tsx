import { useMemo, useState } from 'react'
import type { NamedStat } from '../types'

type SortKey = 'name' | 'students' | 'percentage' | 'rank'

export default function RankTable({ data, title, emptyLabel = 'No records' }: {
  data: NamedStat[]; title?: string; emptyLabel?: string
}) {
  const [sort, setSort] = useState<SortKey>('students')
  const [asc, setAsc] = useState(false)

  const rows = useMemo(() => {
    const copy = [...data]
    copy.sort((a, b) => {
      const av = a[sort] ?? ''
      const bv = b[sort] ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return asc ? cmp : -cmp
    })
    return copy
  }, [data, sort, asc])

  const max = Math.max(1, ...data.map(d => d.students))
  const click = (key: SortKey) => {
    if (sort === key) setAsc(!asc)
    else { setSort(key); setAsc(false) }
  }
  const arrow = (key: SortKey) => sort === key ? (asc ? ' ↑' : ' ↓') : ''

  return (
    <div className="card reveal">
      {title && <h3 className="card-title">{title}</h3>}
      {title && <p className="card-sub">Click a column heading to sort · {data.length} entries</p>}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th onClick={() => click('rank')}>#{arrow('rank')}</th>
              <th onClick={() => click('name')}>{title?.replace('Top 10 ', '') || 'Name'}{arrow('name')}</th>
              <th onClick={() => click('students')} style={{ textAlign: 'right' }}>Students{arrow('students')}</th>
              <th onClick={() => click('percentage')} style={{ textAlign: 'right' }}>Share{arrow('percentage')}</th>
              <th>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="empty">{emptyLabel}</td></tr>}
            {rows.map((row, i) => (
              <tr key={row.name}>
                <td><span className={`rank-badge ${i < 3 ? 'top' : ''}`}>{(row.rank ?? i + 1)}</span></td>
                <td style={{ fontWeight: 600 }}>{row.name}</td>
                <td className="num">{row.students.toLocaleString('en-IN')}</td>
                <td className="num">{row.percentage.toFixed(1)}%</td>
                <td style={{ width: '28%' }}>
                  <div className="bar-cell">
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(row.students / max) * 100}%`, animationDelay: `${i * 40}ms` }} /></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
