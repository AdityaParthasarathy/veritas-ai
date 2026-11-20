import { ExternalLink } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'

/** One reference passage with its source link. `score` is shown only when provided. */
export default function EvidencePassage({ hit, showScore = true }) {
  return (
    <li className="rounded-lg border border-veritas-border-subtle bg-veritas-bg/40 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusBadge tone="accent">{hit.topic}</StatusBadge>
        {showScore && (
          <StatusBadge tone={hit.relevant ? 'success' : 'neutral'}>
            Similarity {hit.score.toFixed(2)}
            {hit.relevant ? ' · related' : ' · weak match'}
          </StatusBadge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-veritas-text">{hit.passage}</p>
      {hit.matched_text && (
        <p className="mt-2 text-xs italic text-veritas-dim">Matched against: “{hit.matched_text}”</p>
      )}
      <a
        href={hit.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-veritas-cyan hover:underline"
      >
        {hit.source_org} · {hit.source_title}
        <ExternalLink className="h-3 w-3" />
      </a>
    </li>
  )
}
