export default function LoadingSkeleton() {
  return (
    <div style={{ padding: '6px 0' }} aria-label="Loading analytics">
      <div className="skeleton" style={{ width: 220, height: 22, marginBottom: 18 }} />
      <div className="grid kpi-grid">
        {Array.from({ length: 8 }, (_, i) => <div className="skeleton skeleton-card" key={i} />)}
      </div>
      <div className="grid chart-grid" style={{ marginTop: 18 }}>
        <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
      </div>
    </div>
  )
}
