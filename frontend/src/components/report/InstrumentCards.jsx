import { Gauge, ScanSearch, SearchX, ShieldHalf } from 'lucide-react'
import StyleScale from './StyleScale'
import TrustLadder from './TrustLadder'
import { LABEL_TEXT } from './reportModel'

function Card({ icon: Icon, tone, title, caption, children }) {
  return (
    <article className="panel flex flex-col p-6">
      <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-md ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="t-h2">{title}</h3>
      <p className="t-caption mb-5 mt-1">{caption}</p>
      {children}
    </article>
  )
}

/** The three instruments, visually distinct and never merged: style, evidence retrieval, trust in the analysis. */
export default function InstrumentCards({ result, reading }) {
  const { classification, evidence, uncertainty } = result
  const hits = evidence.hits
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card icon={Gauge} tone="bg-brand/25 text-violet" title="Writing-style analysis" caption={`Machine-learning output: ${LABEL_TEXT[classification.label].toLowerCase()}.`}>
        <StyleScale probability={classification.probability_unreliable_style} dimmed={reading.outOfDomain} />
        <p className="mt-5 rounded-md border border-line bg-ink-1/70 p-3 text-[0.8125rem] leading-relaxed text-steel">{classification.confidence_note}</p>
        <p className="t-caption mt-3">The model reads style and source habits. It does not read facts, so this is not a measure of truth.</p>
      </Card>

      <Card icon={ScanSearch} tone="bg-signal/15 text-signal" title="Evidence retrieval" caption="Passages close in meaning to the text. Relevance only.">
        <p className="font-display text-[2rem] font-semibold leading-none tracking-tight text-paper">
          {reading.relatedCount}
          <span className="ml-2 text-base font-normal text-dim">of {evidence.collection_size} passages related</span>
        </p>
        {hits.length === 0 || reading.relatedCount === 0 ? (
          <div className="mt-5 flex gap-3 rounded-md border border-dashed border-line-strong p-4">
            <SearchX className="mt-0.5 h-5 w-5 shrink-0 text-dim" aria-hidden="true" />
            <p className="text-[0.875rem] leading-relaxed text-steel">
              Nothing in the collection is close enough in meaning to count as related. The collection is small, so this reflects its coverage, not the accuracy of the text.
            </p>
          </div>
        ) : (
          <ol className="mt-5 space-y-3">
            {hits.slice(0, 4).map((hit, i) => (
              <li key={hit.id} className={hit.relevant ? '' : 'opacity-55'}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[0.8125rem] text-steel">{hit.source_org}</span>
                  <span className="t-data text-[0.8125rem]">{hit.score.toFixed(2)}</span>
                </div>
                <div className="relative mt-1 h-1 rounded-full bg-line">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-signal-gradient transition-[width] duration-slow ease-out" style={{ width: `${hit.score * 100}%`, transitionDelay: `${i * 70}ms` }} />
                  <span aria-hidden="true" className="absolute -inset-y-0.5 w-px bg-paper/70" style={{ left: `${evidence.relevance_threshold * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="t-caption mt-4">The white tick is the relevance cut-off ({evidence.relevance_threshold}).</p>
      </Card>

      <Card icon={ShieldHalf} tone="bg-caution/15 text-caution" title="Trust in this analysis" caption="About the analysis, not the claims.">
        <TrustLadder level={uncertainty.level} />
        {uncertainty.reasons.length > 0 ? (
          <ul className="mt-5 space-y-2 border-t border-line pt-4">
            {uncertainty.reasons.map((reason) => (
              <li key={reason} className="text-[0.8125rem] leading-relaxed text-steel">
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-caption mt-5 border-t border-line pt-4">No specific warning was raised for this text. The standing limitations still apply.</p>
        )}
        <p className="t-caption mt-3">{uncertainty.meaning}</p>
      </Card>
    </div>
  )
}
