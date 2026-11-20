import { ExternalLink } from 'lucide-react'

/**
 * One retrieved reference passage. The bar is the real cosine similarity; the tick is the relevance threshold the
 * backend applied. `number` ties the item to highlighted sentences in the document proof.
 */
export default function EvidenceItem({ hit, number, threshold, active, onActivate, muted = false, showMatched = true }) {
  const pct = Math.min(100, Math.max(0, hit.score * 100))
  return (
    <li
      onPointerEnter={() => onActivate?.(number)}
      onPointerLeave={() => onActivate?.(null)}
      onFocus={() => onActivate?.(number)}
      onBlur={() => onActivate?.(null)}
      className={`grid gap-x-6 gap-y-3 border-t border-line py-5 transition-colors duration-base ease-out sm:grid-cols-[minmax(0,11rem)_1fr] ${active ? 'bg-ink-1' : ''} ${muted ? 'opacity-70' : ''}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {number != null && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-signal/50 px-1 font-mono text-[0.6875rem] text-signal" aria-label={`Reference ${number}`}>
              {number}
            </span>
          )}
          <span className="t-meta truncate">{hit.id}</span>
        </div>
        <p className="t-caption mt-1.5">{hit.topic}</p>
        <div className="mt-3">
          <div className="relative h-1.5 rounded-full bg-line" role="meter" aria-label={`Similarity to the text: ${hit.score.toFixed(2)}`} aria-valuemin={0} aria-valuemax={1} aria-valuenow={hit.score}>
            <span className="absolute inset-y-0 left-0 rounded-full bg-signal transition-[width] duration-slow ease-out" style={{ width: `${pct}%`, opacity: hit.relevant ? 1 : 0.45 }} />
            {threshold != null && <span aria-hidden="true" className="absolute -inset-y-1 w-px bg-paper/70" style={{ left: `${threshold * 100}%` }} />}
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className="t-data text-[0.8125rem]">{hit.score.toFixed(2)}</span>
            {threshold != null && <span className="t-meta">cut-off {threshold}</span>}
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[0.9375rem] leading-relaxed text-paper">{hit.passage}</p>
        {showMatched && hit.matched_text && <p className="t-caption mt-2 italic">Matched against: “{hit.matched_text}”</p>}
        <a href={hit.source_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] text-signal underline decoration-signal/30 hover:decoration-signal">
          {hit.source_org}: {hit.source_title}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </li>
  )
}
