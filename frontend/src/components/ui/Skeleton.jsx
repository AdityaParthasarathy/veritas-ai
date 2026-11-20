/** Loading placeholder with a slow shimmer. Decorative: announce loading text separately. */
export default function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--c-ink-2)_25%,var(--c-ink-3)_50%,var(--c-ink-2)_75%)] bg-[length:200%_100%] ${className}`}
    />
  )
}
