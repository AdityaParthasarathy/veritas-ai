import { useId, useState } from 'react'
import { Copy, Download, Globe, HelpCircle, Printer } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import { useToast } from '../ui/Toast'
import DocumentProof from './DocumentProof'
import EvidenceItem from './EvidenceItem'
import SignalsTable from './SignalsTable'
import StyleScale from './StyleScale'
import TrustLadder from './TrustLadder'
import { buildReading, buildSummaryText, deriveTitle, LABEL_TEXT, notableSignals, percent } from './reportModel'

function Section({ title, aside, children, delay = 0, className = '' }) {
  const id = useId()
  return (
    <Reveal as="section" delay={delay} aria-labelledby={id} className={`border-t border-line pt-8 ${className}`}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="t-h2">
          {title}
        </h2>
        {aside && <p className="t-caption">{aside}</p>}
      </div>
      {children}
    </Reveal>
  )
}

/**
 * The investigation report. Classification, evidence and trust are three separate instruments; the sentence at the
 * top is assembled from their values and never gives a verdict about the text itself.
 * `text` is the submitted document (absent for URL analyses, whose extracted text the API does not return).
 */
export default function Report({ result, text, title, stamp, headingRef }) {
  const toast = useToast()
  const [activeRef, setActiveRef] = useState(null)
  const { classification, uncertainty, evidence, linguistic_signals: signals, source } = result
  const reading = buildReading(result)
  const related = evidence.hits.filter((hit) => hit.relevant)
  const weak = evidence.hits.filter((hit) => !hit.relevant)
  const displayTitle = title || source?.title || deriveTitle(text)

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText(result, { title: displayTitle }))
      toast({ title: 'Summary copied', description: 'It includes the limitations, so it can be shared with them attached.' })
    } catch {
      toast({ title: 'Could not copy', description: 'Your browser blocked clipboard access.', tone: 'error' })
    }
  }
  const downloadJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `veritas-analysis-${new Date().toISOString().slice(0, 10)}.json` })
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <article aria-labelledby="report-title" className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          <h2 id="report-title" ref={headingRef} tabIndex={-1} className="t-h1 outline-none">
            {displayTitle}
          </h2>
          <p className="t-meta mt-3">
            {result.word_count} words{stamp ? ` · ${stamp}` : ''}
            {source ? ` · ${source.domain}` : ''}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={copySummary}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy summary
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadJson}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
          </Button>
        </div>
      </header>

      {/* The reading: one sentence per instrument, kept apart. */}
      <Reveal className="grid gap-x-12 gap-y-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.2] tracking-[-0.015em] text-paper" style={{ fontVariationSettings: "'opsz' 48" }}>
            {reading.outOfDomain ? reading.domain : reading.style}
          </p>
          <ul className="mt-5 space-y-2 text-[1rem] leading-relaxed text-steel">
            {!reading.outOfDomain && <li>{reading.domain}</li>}
            {reading.outOfDomain && <li>{reading.styleNote}</li>}
            <li>{reading.evidence}</li>
            <li className="text-paper">
              {reading.trust.name}. {reading.trust.advice}
            </li>
          </ul>
        </div>
        <p className="t-caption lg:col-span-4 lg:self-end">{result.disclaimer}</p>
      </Reveal>

      {source && (
        <Section title="Source page" aside="Fetched automatically. Metadata can be wrong or missing.">
          <dl className="grid gap-x-10 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ['Domain', source.domain],
              ['Title found', source.title],
              ['Author found', source.author],
              ['Published', source.published],
              ['Text analysed', `${source.extracted_chars.toLocaleString()} characters${source.truncated ? ' (truncated)' : ''}`],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-28 shrink-0 text-dim">{k}</dt>
                  <dd className="min-w-0 break-words text-paper">{v}</dd>
                </div>
              ))}
          </dl>
          <p className="t-caption mt-3 flex items-start gap-2 break-all">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {source.final_url}. The domain says nothing by itself about reliability.
          </p>
        </Section>
      )}

      {/* Three instruments. Never merged into one score. */}
      <Section title="Three separate instruments" aside="Style, evidence and trust do not combine into a verdict." delay={60}>
        <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-0">
          <div className="lg:col-span-5 lg:pr-10">
            <h3 className="t-h3">Style reading</h3>
            <p className="t-caption mb-5">Machine-learning output: {LABEL_TEXT[classification.label].toLowerCase()}.</p>
            <StyleScale probability={classification.probability_unreliable_style} dimmed={reading.outOfDomain} />
            <p className="mt-5 rounded-md bg-ink-2 p-3 text-[0.8125rem] leading-relaxed text-steel">{classification.confidence_note}</p>
          </div>
          <div className="border-line lg:col-span-4 lg:border-l lg:px-10">
            <h3 className="t-h3">Reference passages</h3>
            <p className="t-caption mb-5">Retrieved by meaning. Relevance only.</p>
            {evidence.hits.length === 0 ? (
              <p className="t-body">None retrieved.</p>
            ) : (
              <ol className="space-y-3">
                {evidence.hits.map((hit, i) => (
                  <li key={hit.id} className={hit.relevant ? '' : 'opacity-55'}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-meta truncate">{hit.id}</span>
                      <span className="t-data text-[0.8125rem]">{hit.score.toFixed(2)}</span>
                    </div>
                    <div className="relative mt-1 h-1 rounded-full bg-line">
                      <span className="absolute inset-y-0 left-0 rounded-full bg-signal transition-[width] duration-slow ease-out" style={{ width: `${hit.score * 100}%`, transitionDelay: `${i * 70}ms` }} />
                      <span aria-hidden="true" className="absolute -inset-y-0.5 w-px bg-paper/70" style={{ left: `${evidence.relevance_threshold * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="t-caption mt-4">The white tick is the relevance cut-off ({evidence.relevance_threshold}).</p>
          </div>
          <div className="border-line lg:col-span-3 lg:border-l lg:pl-10">
            <h3 className="t-h3">Trust in this analysis</h3>
            <p className="t-caption mb-5">About the analysis, not the claims.</p>
            <TrustLadder level={uncertainty.level} />
          </div>
        </div>
      </Section>

      <Section title="Why this level of caution" aside={uncertainty.meaning} delay={60}>
        {uncertainty.reasons.length > 0 ? (
          <ul className="space-y-3">
            {uncertainty.reasons.map((reason) => (
              <li key={reason} className="flex gap-3">
                <HelpCircle className="mt-1 h-4 w-4 shrink-0 text-caution" aria-hidden="true" />
                <span className="max-w-3xl text-[0.9375rem] leading-relaxed text-steel">{reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body">No specific warning was raised for this text. The standing limitations below still apply.</p>
        )}
        {uncertainty.domain_check?.available && (
          <p className="t-meta mt-5">
            domain check: {uncertainty.domain_check.in_domain ? <Badge tone="support">in domain</Badge> : <Badge tone="caution">out of domain</Badge>} similarity {uncertainty.domain_check.similarity} · cut-off {uncertainty.domain_check.threshold}
          </p>
        )}
      </Section>

      <Section title="Evidence in context" aside="Matched sentences are marked in the text. A mark means “matched”, not “verified”." delay={60}>
        <div className={text ? 'grid gap-10 lg:grid-cols-12' : ''}>
          {text && (
            <div className="lg:col-span-6">
              <DocumentProof text={text} hits={evidence.hits} activeRef={activeRef} onActivate={setActiveRef} />
            </div>
          )}
          <div className={text ? 'lg:col-span-6' : ''}>
            {related.length > 0 ? (
              <ol className="-mt-5">
                {related.map((hit, i) => (
                  <EvidenceItem key={hit.id} hit={hit} number={i + 1} threshold={evidence.relevance_threshold} active={activeRef === i + 1} onActivate={setActiveRef} showMatched={!text} />
                ))}
              </ol>
            ) : (
              <p className="t-body border-t border-line pt-5">
                No passage in the reference collection ({evidence.collection_size} passages) is clearly related. That says nothing about whether this text is accurate.
              </p>
            )}
            {weak.length > 0 && (
              <details className="group mt-4 border-t border-line pt-4">
                <summary className="cursor-pointer text-[0.8125rem] text-steel hover:text-paper">
                  {weak.length} weaker match{weak.length === 1 ? '' : 'es'} below the cut-off (not treated as related)
                </summary>
                <ol className="mt-2">
                  {weak.map((hit) => (
                    <EvidenceItem key={hit.id} hit={hit} threshold={evidence.relevance_threshold} muted />
                  ))}
                </ol>
              </details>
            )}
          </div>
        </div>
        <p className="t-caption mt-6 max-w-3xl">{evidence.disclaimer}</p>
      </Section>

      <Section title="Linguistic indicators" aside="Descriptive counts. Not used by the classifier and not a measure of truth." delay={60}>
        <SignalsTable signals={signals} />
        {notableSignals(signals).length === 0 && <p className="t-caption mt-3">None of the emphasis or pressure indicators registered for this text.</p>}
      </Section>

      <Section title="Limits and provenance" delay={60}>
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
          <dl className="space-y-3 text-sm">
            {[
              ['Classifier', classification.model.name],
              ['Trained on', classification.model.trained_on],
              ['Agreement with dataset labels', classification.model.test_accuracy_on_dataset_labels != null ? `${percent(classification.model.test_accuracy_on_dataset_labels)} on held-out articles from the same dataset. This is not accuracy on real-world content.` : 'Not available'],
              ['Reference collection', `${evidence.collection_name}, ${evidence.collection_size} passages`],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-x-4 sm:grid-cols-[11rem_1fr]">
                <dt className="text-dim">{k}</dt>
                <dd className="text-steel">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="mb-2 text-sm font-medium text-paper">Always applicable</p>
            <ul className="space-y-2">
              {uncertainty.standing_caveats.map((caveat) => (
                <li key={caveat} className="t-body text-[0.875rem]">
                  {caveat}
                </li>
              ))}
              <li className="t-body text-[0.875rem]">{classification.disclaimer}</li>
            </ul>
          </div>
        </div>
      </Section>
    </article>
  )
}
