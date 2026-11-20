export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs>
          <linearGradient id="veritas-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8B7CFF" />
            <stop offset="1" stopColor="#42D9E8" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="#141E30" stroke="#1F2C44" />
        <path d="M8 9l8 15 8-15" fill="none" stroke="url(#veritas-logo)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[0.14em] text-veritas-text">
          VERITAS <span className="font-medium text-veritas-muted">AI</span>
        </span>
      )}
    </div>
  )
}
