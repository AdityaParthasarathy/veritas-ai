/** Empty state: what is missing, why, and the next action. `art` is an optional SVG. */
export default function EmptyState({ title, children, action, art, className = '' }) {
  return (
    <div className={`flex flex-col items-start gap-5 border-t border-line py-10 sm:flex-row sm:items-center sm:gap-10 ${className}`}>
      {art && <div className="shrink-0 text-line-strong">{art}</div>}
      <div>
        <h2 className="t-h2">{title}</h2>
        <p className="t-body mt-2">{children}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}
