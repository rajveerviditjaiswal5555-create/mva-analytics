import AnimatedNumber from './AnimatedNumber'

interface Props {
  label: string
  value: number
  icon: string
  color?: string
  tint?: string
  decimals?: number
  prefix?: string
  suffix?: string
  foot?: React.ReactNode
  index?: number
}

export default function KpiCard({
  label, value, icon, color = '#2563eb', tint = '#eaf1fb',
  decimals = 0, prefix = '', suffix = '', foot, index = 0,
}: Props) {
  return (
    <div className="kpi" style={{
      ['--kpi-color' as string]: color,
      ['--kpi-tint' as string]: tint,
      animation: `fadeUp .5s ${index * 45}ms both`,
    }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  )
}
