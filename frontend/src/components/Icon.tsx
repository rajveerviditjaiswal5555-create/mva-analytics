import type { CSSProperties, ReactNode } from 'react'

/** 20×20 stroke icon set — consistent 1.6px weight, currentColor, no emoji. */
const PATHS: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  map: (
    <>
      <path d="M2.5 5.5 7 3.5l6 2 4.5-2v11l-4.5 2-6-2-4.5 2z" />
      <path d="M7 3.5v11M13 5.5v11" />
    </>
  ),
  chart: <path d="M3 17V9M8 17V4M13 17v-6M18 17V7" />,
  star: <path d="m10 2.5 2.3 4.7 5.2.8-3.8 3.6.9 5.2-4.6-2.4-4.6 2.4.9-5.2L2.5 8l5.2-.8z" />,
  trend: (
    <>
      <path d="m3 14 5-5 3 3 6-7" />
      <path d="M13 5h4v4" />
    </>
  ),
  swap: (
    <>
      <path d="M4 7h11l-3-3M16 13H5l3 3" />
    </>
  ),
  search: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.2 13.2 4 4" />
    </>
  ),
  shield: (
    <>
      <path d="M10 2.5 16 5v5c0 4-3 6.5-6 7.5-3-1-6-3.5-6-7.5V5z" />
      <path d="m7 10 2 2 4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" />
    </>
  ),
  sun: (
    <>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2v1.8M10 16.2V18M2 10h1.8M16.2 10H18M4.3 4.3l1.3 1.3M14.4 14.4l1.3 1.3M15.7 4.3l-1.3 1.3M5.6 14.4l-1.3 1.3" />
    </>
  ),
  moon: <path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7z" />,
  globe: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c2.2 2.2 3.2 4.7 3.2 7.5s-1 5.3-3.2 7.5c-2.2-2.2-3.2-4.7-3.2-7.5s1-5.3 3.2-7.5z" />
    </>
  ),
  logout: (
    <>
      <path d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17H8" />
      <path d="m12 6 4 4-4 4M16 10H8" />
    </>
  ),
  chevron: <path d="m8 5 5 5-5 5" />,
  users: (
    <>
      <circle cx="7.5" cy="7" r="3" />
      <path d="M2.5 17c0-3 2.2-4.5 5-4.5s5 1.5 5 4.5" />
      <path d="M13 4.6a3 3 0 0 1 0 5.8M14.5 12.8c2 .4 3 1.8 3 4.2" />
    </>
  ),
  pin: (
    <>
      <path d="M10 18s6-5.2 6-9.5a6 6 0 1 0-12 0C4 12.8 10 18 10 18z" />
      <circle cx="10" cy="8.3" r="2.2" />
    </>
  ),
  flag: (
    <>
      <path d="M5 18V3h10l-1.7 3.5L15 10H5" />
    </>
  ),
  sparkles: (
    <>
      <path d="m10 2.5 1.7 4.6L16 8.8l-4.3 1.7L10 15l-1.7-4.5L4 8.8l4.3-1.7z" />
      <path d="m15.7 13.6.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
    </>
  ),
  download: (
    <>
      <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5" />
      <path d="M3.5 14v1.5A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5V14" />
    </>
  ),
  printer: (
    <>
      <path d="M6 7V3h8v4" />
      <rect x="3" y="7" width="14" height="7" rx="1.5" />
      <path d="M6 12h8v5H6z" />
    </>
  ),
  refresh: (
    <>
      <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6" />
      <path d="M16.5 3v4h-4" />
    </>
  ),
  arrowRight: <path d="M3 10h13m0 0-4-4m4 4-4 4" />,
  filter: (
    <>
      <path d="M3 5h14M6 10h8M8.5 15h3" />
    </>
  ),
  menu: <path d="M3 5h14M3 10h14M3 15h14" />,
  close: <path d="m5 5 10 10M15 5 5 15" />,
  layers: (
    <>
      <path d="m10 2.5 7 3.5-7 3.5L3 6z" />
      <path d="m3 10 7 3.5 7-3.5" />
      <path d="m3 13.5 7 3.5 7-3.5" />
    </>
  ),
  database: (
    <>
      <ellipse cx="10" cy="5" rx="6.5" ry="2.5" />
      <path d="M3.5 5v10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V5" />
      <path d="M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" />
    </>
  ),
  zap: <path d="M11 2.5 4 11h5l-1 6.5 7-8.5h-5z" />,
  alert: (
    <>
      <path d="M10 3 18 17H2z" />
      <path d="M10 8v4M10 14.5v.5" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v4.5M10 6.5v.5" />
    </>
  ),
  check: <path d="m4 10.5 4 4 8-9" />,
  clock: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4.3l2.8 1.7" />
    </>
  ),
  file: (
    <>
      <path d="M5 2.5h6l4 4V17.5H5z" />
      <path d="M11 2.5v4h4" />
    </>
  ),
}

export type IconName = keyof typeof PATHS

interface Props {
  name: IconName | string
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}

export default function Icon({ name, size = 16, strokeWidth = 1.6, className, style }: Props) {
  const node = PATHS[name] ?? PATHS.info
  return (
    <svg
      width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true" focusable="false"
    >
      {node}
    </svg>
  )
}
