import { useState } from 'react'
import { Telescope } from 'lucide-react'
import Tabs from '../ui/Tabs'
import EvidenceItem from './EvidenceItem'

/**
 * Evidence explorer: source cards for every retrieved passage. The only filter offered is the one the backend's own
 * relevance threshold supports (related vs below the cut-off); order is by similarity as returned.
 */
export default function EvidenceExplorer({ evidence, activeRef, onActivate, showMatched }) {
  const related = evidence.hits.filter((hit) => hit.relevant)
  const weak = evidence.hits.filter((hit) => !hit.relevant)
  const [filter, setFilter] = useState(related.length > 0 ? 'related' : 'all')
  const tabs = [
    { id: 'related', label: 'Related', count: related.length },
    { id: 'below', label: 'Below cut-off', count: weak.length },
    { id: 'all', label: 'All', count: evidence.hits.length },
  ]
  const visible = filter === 'related' ? related : filter === 'below' ? weak : evidence.hits

  return (
    <div>
      {related.length === 0 && (
        <div className="panel mb-6 flex flex-col gap-4 border-dashed p-6 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-3 text-dim">
            <Telescope className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-paper">No related passages</p>
            <p className="t-body mt-1 text-[0.9375rem]">
              No passage in the reference collection ({evidence.collection_size} passages) is clearly related. That says nothing about whether this text is accurate.
            </p>
            <p className="t-caption mt-2">The collection covers a narrow set of institutional topics. A text about anything else will usually find nothing, whatever its quality.</p>
          </div>
        </div>
      )}
      {evidence.hits.length > 0 && (
        <>
          <Tabs tabs={tabs} value={filter} onChange={setFilter} label="Filter retrieved passages" idPrefix="evidence-filter" />
          <div id="evidence-filter-panel" role="tabpanel" aria-labelledby={`evidence-filter-tab-${filter}`} className="pt-5">
            {visible.length === 0 ? (
              <p className="t-body">Nothing in this group.</p>
            ) : (
              <ol className="grid gap-4 md:grid-cols-2">
                {visible.map((hit) => {
                  const number = hit.relevant ? related.indexOf(hit) + 1 : undefined
                  return <EvidenceItem key={hit.id} hit={hit} number={number} threshold={evidence.relevance_threshold} active={number != null && activeRef === number} onActivate={hit.relevant ? onActivate : undefined} showMatched={showMatched} muted={!hit.relevant} />
                })}
              </ol>
            )}
          </div>
        </>
      )}
      <p className="t-caption mt-6 max-w-3xl">{evidence.disclaimer}</p>
    </div>
  )
}
