import { useId } from 'react'

const LINES = 14

/**
 * A field of fine contour lines, like a terrain of signal. Pure decoration: it carries no data. Static, so it needs no
 * reduced-motion handling.
 */
export default function WaveField({ className = '' }) {
  const id = useId()
  const paths = Array.from({ length: LINES }, (_, i) => {
    const y = 40 + i * 11
    const amp = 38 - i * 1.4
    return `M0 ${y + 40} C 220 ${y - amp}, 430 ${y + amp + 50}, 720 ${y + 10} S 1200 ${y - amp + 20}, 1440 ${y + 30}`
  })
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 260" preserveAspectRatio="none" className={className} fill="none">
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7654F6" stopOpacity="0" />
          <stop offset="0.35" stopColor="#A78BFA" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#45D9E8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#45D9E8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path key={i} d={d} stroke={`url(#${id}-s)`} strokeWidth="1" strokeOpacity={1 - i * 0.05} />
      ))}
    </svg>
  )
}
