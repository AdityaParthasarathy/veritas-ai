import { useId } from 'react'

function DocCard({ className = '', lines = [], mark = -1, delay = '0s' }) {
  return (
    <div
      aria-hidden="true"
      className={`glass animate-float absolute w-40 rounded-lg p-3 sm:w-48 ${className}`}
      style={{ animationDelay: delay }}
    >
      <div className="mb-2.5 h-1.5 w-10 rounded-full bg-violet/60" />
      <div className="space-y-1.5">
        {lines.map((width, i) => (
          <div key={i} className={`h-1 rounded-full ${i === mark ? 'bg-signal' : 'bg-steel/30'}`} style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  )
}

/**
 * The hero motif: a luminous faceted V inside a tilted orbit, with translucent document sheets drifting around it.
 * Pure decoration and a metaphor (noise on the left stroke, signal on the right). It contains no data and no result.
 */
export default function HeroVisual({ className = '' }) {
  const id = useId()
  return (
    <div aria-hidden="true" className={`relative mx-auto aspect-square w-full max-w-[34rem] ${className}`}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" fill="none">
        <defs>
          <linearGradient id={`${id}-a`} x1="80" y1="90" x2="200" y2="320" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C4B5FD" />
            <stop offset="1" stopColor="#7654F6" />
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="320" y1="90" x2="200" y2="320" gradientUnits="userSpaceOnUse">
            <stop stopColor="#86EAF3" />
            <stop offset="1" stopColor="#7654F6" />
          </linearGradient>
          <radialGradient id={`${id}-halo`} cx="50%" cy="52%" r="50%">
            <stop stopColor="#7654F6" stopOpacity="0.45" />
            <stop offset="1" stopColor="#7654F6" stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <circle cx="200" cy="205" r="190" fill={`url(#${id}-halo)`} />
        {/* Orbit: a tilted ellipse that turns slowly; stops under reduced motion. */}
        <g className="origin-center animate-orbit" style={{ transformOrigin: '200px 205px' }}>
          <ellipse cx="200" cy="205" rx="178" ry="62" transform="rotate(-18 200 205)" stroke="#A78BFA" strokeOpacity="0.4" strokeWidth="1.2" />
          <circle cx="368" cy="160" r="4" fill="#45D9E8" />
          <circle cx="32" cy="250" r="2.5" fill="#A78BFA" />
        </g>
        {/* Glow copy, then the crisp V. */}
        <g filter={`url(#${id}-glow)`} opacity="0.75">
          <path d="M96 100 L200 316" stroke={`url(#${id}-a)`} strokeWidth="30" strokeLinecap="round" />
          <path d="M304 100 L200 316" stroke={`url(#${id}-b)`} strokeWidth="30" strokeLinecap="round" />
        </g>
        <path d="M96 100 L200 316" stroke={`url(#${id}-a)`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M304 100 L200 316" stroke={`url(#${id}-b)`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M96 100 L200 316 L304 100" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M132 100 L200 242" stroke="#fff" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <DocCard className="left-0 top-[12%]" lines={[90, 70, 82, 55]} mark={2} delay="0s" />
      <DocCard className="bottom-[10%] right-0" lines={[80, 94, 60]} mark={1} delay="-3.2s" />
    </div>
  )
}
