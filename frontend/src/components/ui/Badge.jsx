const TONES = {
  neutral: 'border-line-strong text-steel',
  signal: 'border-signal/40 text-signal',
  caution: 'border-caution/45 text-caution',
  support: 'border-support/45 text-support',
  contra: 'border-contra/45 text-contra',
}

/** Small outlined status label. Colour carries state, never truth. */
export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px font-mono text-[0.6875rem] leading-5 ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}
