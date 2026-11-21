import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

/** Counts up from 0 to `value` using requestAnimationFrame whenever the value changes. */
export default function AnimatedNumber({
  value, decimals = 0, prefix = '', suffix = '', duration = 850, className,
}: Props) {
  const [display, setDisplay] = useState(0)
  const previous = useRef(0)

  useEffect(() => {
    const from = previous.current
    const delta = value - from
    if (delta === 0) return
    let frame = 0
    const start = performance.now()
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setDisplay(from + delta * ease(progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else previous.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      previous.current = value
    }
  }, [value, duration])

  const formatted = display.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return <span className={className}>{prefix}{formatted}{suffix}</span>
}
