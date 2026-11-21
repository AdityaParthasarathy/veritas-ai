const TONES = {
  neutral: 'border-line-strong bg-ink-2/60 text-steel',
  brand: 'border-violet/40 bg-brand/15 text-violet',
  signal: 'border-signal/40 bg-signal/10 text-signal',
  caution: 'border-caution/45 bg-caution/10 text-caution',
  support: 'border-support/45 bg-support/10 text-support',
  contra: 'border-contra/45 bg-contra/10 text-contra',
}

/** Small outlined status label. Colour carries state, never truth. */
export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px font-mono text-[0.6875rem] leading-5 ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}
