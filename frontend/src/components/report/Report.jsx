import { useId, useState } from 'react'
import { Globe } from 'lucide-react'
import Reveal from '../ui/Reveal'
import ArticlePanel from './ArticlePanel'
import EvidenceExplorer from './EvidenceExplorer'
import InstrumentCards from './InstrumentCards'
import ReportHeader from './ReportHeader'
import ReportNav from './ReportNav'
import ReportOverview from './ReportOverview'
import SignalsTable from './SignalsTable'
import Takeaway from './Takeaway'
import { buildReading, deriveTitle, notableSignals, percent } from './reportModel'

function Section({ id, title, aside, children, delay = 0 }) {
  const headingId = useId()
  return (
    <Reveal as="section" id={id} delay={delay} aria-labelledby={headingId} className="scroll-mt-28">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={headingId} className="text-[clamp(1.25rem,2vw,1.5rem)] font-semibold tracking-[-0.025em] text-paper">
          {title}
        </h2>
        {aside && <p className="t-caption max-w-xl">{aside}</p>}
      </div>
      {children}
    </Reveal>
  )
}

/**
 * The investigation report, laid out as a document: header with every action, a section rail, then overview,
 * the three readings, evidence, the article, and method. Every sentence is assembled from fields the API returned;
 * nothing here gives a verdict about the text itself. `text` is the submitted document (absent for URL analyses, whose
 * extracted text the API does not return).
 */
export default function Report({ result, text, title, stamp, headingRef, onRerun, onNew, draft }) {
  const [activeRef, setActiveRef] = useState(null)
  const { classification, uncertainty, evidence, linguistic_signals: signals, source } = result
  const reading = buildReading(result)
  const displayTitle = title || source?.title || deriveTitle(text)

  return (
    <article aria-labelledby="report-title">
      <ReportHeader result={result} title={displayTitle} text={text} stamp={stamp} inputType={source ? 'Article URL' : 'Pasted text'} headingRef={headingRef} onRerun={onRerun} onNew={onNew} draft={draft} />

      <div className="mt-8 grid gap-x-10 gap-y-6 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <ReportNav />
        <div className="min-w-0 space-y-14">
          <section id="overview" className="scroll-mt-28 space-y-6">
            <ReportOverview result={result} />
            <Takeaway result={result} />
            <p className="t-caption max-w-4xl">{result.disclaimer}</p>
          </section>

          {source && (
            <Section title="Source page" aside="Fetched automatically. Metadata can be wrong or missing.">
              <div className="panel p-5">
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
              </div>
            </Section>
          )}

          <Section title="Three separate readings" aside="Style, evidence and trust do not combine into a verdict.">
            <InstrumentCards result={result} reading={reading} />
          </Section>

          <Section id="evidence" title="Related reference material" aside="Semantic similarity, not support. Matched sentences are marked in the article.">
            <EvidenceExplorer evidence={evidence} activeRef={activeRef} onActivate={setActiveRef} showMatched={!text} />
          </Section>

          {text && (
            <Section title="Article details" aside="The text as submitted, with matched sentences marked.">
              <div className="panel p-5 sm:p-6">
                <ArticlePanel text={text} hits={evidence.hits} activeRef={activeRef} onActivate={setActiveRef} />
              </div>
            </Section>
          )}

          <Section id="method" title="Method and limitations" aside="Descriptive counts and provenance. Not used by the classifier and not a measure of truth.">
            <div className="space-y-6">
              <div className="panel p-5 sm:p-6">
                <h3 className="t-h3 mb-3">Linguistic indicators</h3>
                <SignalsTable signals={signals} />
                {notableSignals(signals).length === 0 && <p className="t-caption mt-3">None of the emphasis or pressure indicators registered for this text.</p>}
              </div>
              <div className="panel grid gap-x-12 gap-y-8 p-5 sm:p-6 xl:grid-cols-2">
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
            </div>
          </Section>
        </div>
      </div>
    </article>
  )
}
