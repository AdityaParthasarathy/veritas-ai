const TONES = {
  success: 'bg-veritas-success-light text-veritas-success',
  error: 'bg-veritas-error-light text-veritas-error',
  warning: 'bg-veritas-warning-light text-veritas-warning',
  neutral: 'bg-white/5 text-veritas-muted',
  accent: 'bg-veritas-primary-light text-veritas-primary',
}

export default function StatusBadge({ tone = 'neutral', children, pulse = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`} />
      {children}
    </span>
  )
}
