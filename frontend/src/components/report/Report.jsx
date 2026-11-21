import { useId, useState } from 'react'
import { Copy, Download, Globe, Printer } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import { useToast } from '../ui/Toast'
import ArticlePanel from './ArticlePanel'
import AssessmentHero from './AssessmentHero'
import ClaimBreakdown from './ClaimBreakdown'
import EvidenceExplorer from './EvidenceExplorer'
import InstrumentCards from './InstrumentCards'
import SignalsTable from './SignalsTable'
import { buildAssessment, buildReading, buildSummaryText, deriveTitle, notableSignals, percent } from './reportModel'

function Section({ title, aside, children, delay = 0, className = '' }) {
  const id = useId()
  return (
    <Reveal as="section" delay={delay} aria-labelledby={id} className={className}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="t-h1 text-[clamp(1.25rem,2vw,1.625rem)]">
          {title}
        </h2>
        {aside && <p className="t-caption max-w-xl">{aside}</p>}
      </div>
      {children}
    </Reveal>
  )
}

/**
 * The investigation report. Order: overall assessment, the three instruments, claim breakdown, evidence, the article,
 * then technical detail. Every sentence is assembled from fields the API returned; nothing here gives a verdict about
 * the text itself. `text` is the submitted document (absent for URL analyses, whose extracted text the API does not return).
 */
export default function Report({ result, text, title, stamp, headingRef }) {
  const toast = useToast()
  const [activeRef, setActiveRef] = useState(null)
  const { classification, uncertainty, evidence, linguistic_signals: signals, source } = result
  const reading = buildReading(result)
  const assessment = buildAssessment(result)
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
    <article aria-labelledby="report-title" className="space-y-12">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          <p className="t-eyebrow mb-2">Investigation report</p>
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
          <Button variant="secondary" size="sm" onClick={downloadJson}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
          </Button>
        </div>
      </header>

      <Reveal>
        <AssessmentHero assessment={assessment} reading={reading} result={result} />
        <p className="t-caption mt-3 max-w-4xl">{result.disclaimer}</p>
      </Reveal>

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

      <Section title="Three separate instruments" aside="Style, evidence and trust do not combine into a verdict." delay={40}>
        <InstrumentCards result={result} reading={reading} />
        {uncertainty.domain_check?.available && (
          <p className="t-meta mt-4">
            domain check: {uncertainty.domain_check.in_domain ? <Badge tone="support">in domain</Badge> : <Badge tone="caution">out of domain</Badge>} similarity {uncertainty.domain_check.similarity} · cut-off {uncertainty.domain_check.threshold}
          </p>
        )}
      </Section>

      <Section title="Claim breakdown" aside="Shown only from what the analysis actually produced." delay={40}>
        <ClaimBreakdown text={text} hits={evidence.hits} claims={result.claims ?? null} />
      </Section>

      <Section title="Evidence explorer" aside="Matched sentences are marked in the article. A mark means “matched”, not “verified”." delay={40}>
        <EvidenceExplorer evidence={evidence} activeRef={activeRef} onActivate={setActiveRef} showMatched={!text} />
      </Section>

      {text && (
        <Section title="Article details" aside="The text as submitted, with matched sentences marked." delay={40}>
          <div className="panel p-5 sm:p-6">
            <ArticlePanel text={text} hits={evidence.hits} activeRef={activeRef} onActivate={setActiveRef} />
          </div>
        </Section>
      )}

      <Section title="Technical analysis details" aside="Descriptive counts and provenance. Not used by the classifier and not a measure of truth." delay={40}>
        <div className="space-y-8">
          <div className="panel p-5 sm:p-6">
            <h3 className="t-h3 mb-3">Linguistic indicators</h3>
            <SignalsTable signals={signals} />
            {notableSignals(signals).length === 0 && <p className="t-caption mt-3">None of the emphasis or pressure indicators registered for this text.</p>}
          </div>
          <div className="panel grid gap-x-12 gap-y-8 p-5 sm:p-6 lg:grid-cols-2">
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
    </article>
  )
}
