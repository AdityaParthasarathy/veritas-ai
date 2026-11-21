import { ExternalLink } from 'lucide-react'
import Badge from '../ui/Badge'

/**
 * One retrieved reference passage, shown as a source card. The bar is the real cosine similarity and the tick is the
 * relevance threshold the backend applied. `number` ties the card to marked sentences in the document proof.
 * The relationship to the text is stated as "not assessed" because the backend does not establish one.
 */
export default function EvidenceItem({ hit, number, threshold, active, onActivate, muted = false, showMatched = true }) {
  const pct = Math.min(100, Math.max(0, hit.score * 100))
  return (
    <li
      onPointerEnter={() => onActivate?.(number)}
      onPointerLeave={() => onActivate?.(null)}
      onFocus={() => onActivate?.(number)}
      onBlur={() => onActivate?.(null)}
      className={`panel flex flex-col gap-4 p-5 transition-[border-color,background-color] duration-base ease-out ${active ? 'border-violet/60 bg-ink-3/60' : ''} ${muted ? 'opacity-75' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {number != null && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand/30 px-1.5 font-mono text-[0.6875rem] text-violet" aria-label={`Reference ${number}`}>
            {number}
          </span>
        )}
        <Badge tone="brand">{hit.source_org}</Badge>
        <Badge>{hit.topic}</Badge>
        <span className="t-meta ml-auto truncate">{hit.id}</span>
      </div>

      <div className="min-w-0">
        <p className="text-[0.9375rem] leading-relaxed text-paper">{hit.passage}</p>
        {showMatched && hit.matched_text && <p className="t-caption mt-2.5 border-l-2 border-line-strong pl-3 italic">Matched against: “{hit.matched_text}”</p>}
      </div>

      <div>
        <div className="relative h-1.5 rounded-full bg-line" role="meter" aria-label={`Similarity to the text: ${hit.score.toFixed(2)}`} aria-valuemin={0} aria-valuemax={1} aria-valuenow={hit.score}>
          <span className="absolute inset-y-0 left-0 rounded-full bg-signal-gradient transition-[width] duration-slow ease-out" style={{ width: `${pct}%`, opacity: hit.relevant ? 1 : 0.45 }} />
          {threshold != null && <span aria-hidden="true" className="absolute -inset-y-1 w-px bg-paper/70" style={{ left: `${threshold * 100}%` }} />}
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="t-data text-[0.8125rem]">relevance {hit.score.toFixed(2)}</span>
          {threshold != null && <span className="t-meta">cut-off {threshold}</span>}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3">
        <a href={hit.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-signal underline decoration-signal/30 hover:decoration-signal">
          <span className="truncate">{hit.source_title}</span>
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <span className="t-meta">Support or contradiction: not assessed</span>
      </div>
    </li>
  )
}
