import { Info } from 'lucide-react'
import { buildPrimary, buildReading } from './reportModel'

export const NOTICE = 'VERITAS analyses writing patterns and retrieves related references. It does not independently verify whether an article’s claims are true or false.'

function Reading({ step, question, value, detail }) {
  return (
    <div className="rounded-lg border border-line bg-ink-1/70 px-4 py-3">
      <dt className="flex items-center gap-2">
        <span className="font-mono text-[0.6875rem] text-violet">{step}</span>
        <span className="t-meta">{question}</span>
      </dt>
      <dd className="mt-1.5 text-[0.9375rem] font-semibold text-paper">{value}</dd>
      <dd className="t-caption mt-0.5">{detail}</dd>
    </div>
  )
}

/**
 * The first screen of a report. It answers three separate questions (what did the classifier observe, what was
 * retrieved, how far to trust the analysis) and states, in the same view, that none of them is a fact-check.
 */
export default function ReportOverview({ result }) {
  const primary = buildPrimary(result)
  const reading = buildReading(result)
  const { classification, evidence } = result
  const p = classification.probability_unreliable_style
  return (
    <section aria-labelledby="primary-title" className="glass rounded-lg p-6 sm:p-8">
      <p className="t-eyebrow">What did the classifier observe?</p>
      <h2 id="primary-title" className="mt-3 max-w-3xl text-[clamp(1.5rem,2.8vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-paper">
        {primary.headline}
      </h2>
      {primary.styleNote && <p className="mt-3 max-w-3xl text-[0.9375rem] text-steel">{primary.styleNote}</p>}

      <div className={`mt-6 max-w-2xl ${primary.notMeaningful ? 'opacity-60' : ''}`}>
        <p className="t-data text-[0.8125rem]">{primary.measurement}</p>
        <div role="presentation" className="relative mt-2.5 h-1.5 rounded-full bg-line">
          <span className="absolute inset-y-0 left-0 rounded-full bg-signal-gradient" style={{ width: `${Math.max(1, p * 100)}%` }} />
          <span aria-hidden="true" className="absolute -inset-y-1 left-1/2 w-px bg-paper/40" />
        </div>
        <p className="t-caption mt-2.5 flex gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" aria-hidden="true" />
          <span>{primary.note}</span>
        </p>
      </div>

      <dl className="mt-7 grid gap-3 md:grid-cols-3">
        <Reading step="01" question="Observed" value={reading.notMeaningful ? 'Not meaningful here' : classification.label === 'resembles_unreliable_sources' ? 'Unreliable-like style' : 'Reliable-like style'} detail="Writing style, from the classifier" />
        <Reading step="02" question="Retrieved" value={reading.relatedCount === 0 ? 'No related passage' : `${reading.relatedCount} related passage${reading.relatedCount === 1 ? '' : 's'}`} detail={`of ${evidence.collection_size} in the reference collection`} />
        <Reading step="03" question="Trust" value={reading.trust.name} detail={reading.trust.advice} />
      </dl>

      <p role="note" className="mt-6 rounded-lg border border-violet/30 bg-brand/10 px-4 py-3 text-[0.875rem] leading-relaxed text-paper">
        {NOTICE}
      </p>
    </section>
  )
}
