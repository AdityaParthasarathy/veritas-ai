/**
 * VERITAS mark: a V whose left stroke is noise (jagged) and whose right stroke is signal (straight),
 * meeting at one point. Wordmark in the display serif.
 */
export function LogoMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5 L7.5 9.5 L5.5 12 L10 15.5 L8.6 18 L13 20.5 L11.8 22.2 L16 27" stroke="#8691A0" strokeWidth="1.6" />
      <path d="M28 5 L16 27" stroke="#57D8E6" strokeWidth="2" />
    </svg>
  )
}

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.375rem] leading-none tracking-[-0.01em] text-paper" style={{ fontVariationSettings: "'opsz' 28" }}>
        Veritas
      </span>
    </span>
  )
}
