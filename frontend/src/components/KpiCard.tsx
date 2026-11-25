import AnimatedNumber from './AnimatedNumber'

interface Props {
  label: string
  value: number
  icon: React.ReactNode
  color?: string
  tint?: string
  decimals?: number
  prefix?: string
  suffix?: string
  foot?: React.ReactNode
  index?: number
  compact?: boolean
}

export default function KpiCard({
  label, value, icon, color = '#0d99ff', tint = '#e8f4ff',
  decimals = 0, prefix = '', suffix = '', foot, index = 0, compact = false,
}: Props) {
  return (
    <div className={`kpi${compact ? ' compact' : ''}`} style={{
      ['--kpi-color' as string]: color,
      ['--kpi-tint' as string]: tint,
      animation: `fadeUp .45s ${index * 45}ms both`,
    }}>
      <div className="kpi-icon">{icon}</div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">
          <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
        </div>
        {foot && <div className="kpi-foot">{foot}</div>}
      </div>
    </div>
  )
}
