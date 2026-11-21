import { useId } from 'react'

/**
 * VERITAS mark: a faceted V. The left stroke is violet (the question), the right stroke cyan (the measurement); they
 * meet at one point. Wordmark in Inter with a quiet "AI" suffix.
 */
export function LogoMark({ className = 'h-7 w-7' }) {
  const id = useId()
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={`${id}-l`} x1="4" y1="5" x2="16" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="1" stopColor="#8060FF" />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="28" y1="5" x2="16" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#48D9ED" />
          <stop offset="1" stopColor="#8060FF" />
        </linearGradient>
      </defs>
      <path d="M4 5 L16 27" stroke={`url(#${id}-l)`} strokeWidth="3.2" />
      <path d="M28 5 L16 27" stroke={`url(#${id}-r)`} strokeWidth="3.2" />
      <path d="M10 5 L16 16" stroke="#A78BFA" strokeOpacity="0.45" strokeWidth="1.4" />
    </svg>
  )
}

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1rem] font-semibold uppercase leading-none tracking-[0.14em] text-paper">
        Veritas<span className="ml-1.5 text-violet">AI</span>
      </span>
    </span>
  )
}
