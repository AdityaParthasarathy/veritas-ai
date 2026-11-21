import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import InvestigationPanel from '../components/investigate/InvestigationPanel'
import StrikeStory from '../components/landing/StrikeStory'
import { describeReadout } from '../components/layout/readoutText'
import { EvidenceDiagram, StyleDiagram, TrustDiagram } from '../components/signal/Diagrams'
import Button from '../components/ui/Button'
import Reveal from '../components/ui/Reveal'
import Skeleton from '../components/ui/Skeleton'
import { PIPELINE } from '../data/pipeline'

const SampleReport = lazy(() => import('../components/landing/SampleReport'))

const INSTRUMENTS = [
  { title: 'Writing style', diagram: <StyleDiagram />, body: 'Does the writing resemble examples labelled reliable or unreliable in the training data? You get the label and the model probability, with a note on what that number is not.' },
  { title: 'Evidence relevance', diagram: <EvidenceDiagram />, body: 'Which reference passages are close in meaning? Each comes with its source, link and similarity. If none is close, the report says so, and that proves nothing.' },
  { title: 'Trust in the analysis', diagram: <TrustDiagram />, body: 'Short text, text unlike the training news, an undecided model or missing evidence raise caution. A confident model never lowers it.' },
]

const DOES = ['Measures how a text is written', 'Retrieves related reference passages with their sources', 'Says how far to trust its own analysis', 'Shows every limit next to every result']
const DOES_NOT = ['Decide whether a claim is true or false', 'Treat missing evidence as proof of fabrication', 'Verify individual claims', 'Turn “resembles unreliable sources” into a verdict']
const EMPTY = { mode: 'text', title: '', text: '', url: '' }

/** An editorial section: a narrow label column on the left, the content on the right, a hairline above. */
function Section({ id, number, label, title, lead, children, tone = '' }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-20 border-t border-line ${tone}`}>
      <div className="mx-auto grid max-w-[88rem] gap-x-12 gap-y-8 px-4 py-16 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-24">
        <div>
          <p className="t-eyebrow">
            {number} / {label}
          </p>
        </div>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="t-h1 max-w-3xl">
            {title}
          </h2>
          {lead && <p className="t-lead mt-4">{lead}</p>}
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const { readout } = useOutletContext() ?? {}
  const status = readout ? describeReadout(readout) : null
  const navigate = useNavigate()
  const [value, setValue] = useState(EMPTY)
  const [touched, setTouched] = useState(false)

  return (
    <div>
      {/* Masthead: the claim, the limit, and the input, side by side. */}
      <section aria-label="Introduction">
        <div className="mx-auto grid max-w-[88rem] gap-x-14 gap-y-10 px-4 pb-16 pt-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:pb-24 lg:pt-20">
          <div className="flex flex-col justify-center">
            <p className="t-eyebrow">A statistical text-analysis instrument</p>
            <h1 className="t-hero mt-5">
              Three readings of a text. <span className="t-accent text-gradient">No verdict.</span>
            </h1>
            <p className="t-lead mt-7">VERITAS AI examines how a piece of writing is composed, retrieves related reference material, and says how far to trust its own analysis.</p>
            <p className="mt-4 max-w-xl border-l-2 border-line-strong pl-4 text-[0.9375rem] text-steel">
              It does not decide whether a claim is true or false, and a high model score is a statement about writing patterns, not about facts.
            </p>
            {status && (
              <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-2" aria-label="Live system readout">
                {[
                  ['API', readout.api === 'online' ? 'online' : readout.api],
                  ['Database', readout.database],
                  ['Models', readout.models === 'ready' && readout.loadSeconds != null ? `ready (${readout.loadSeconds}s load)` : readout.models.replace('_', ' ')],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-2">
                    <dt className="t-meta">{k}</dt>
                    <dd className="t-data text-[0.8125rem]">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="self-center">
            <InvestigationPanel
              value={value}
              onChange={(next) => setValue((current) => ({ ...current, ...next }))}
              touched={touched}
              onTouch={setTouched}
              onClear={() => setValue(EMPTY)}
              onSubmit={() => navigate('/analyze', { state: { draft: { mode: value.mode, title: '', text: value.text, url: value.url.trim() } } })}
            />
          </div>
        </div>
      </section>

      {/* A real recorded report, so the product is shown rather than described. */}
      <section className="border-t border-line bg-ink-1" aria-label="Sample report">
        <div className="mx-auto max-w-[88rem] px-4 pt-16 sm:px-8 lg:pt-20">
          <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-5xl" />}>
            <SampleReport />
          </Suspense>
        </div>
      </section>

      <Section id="story" number="01" label="The difference" title="Information is not the same as checked information.">
        <StrikeStory />
      </Section>

      <Section
        id="how"
        number="02"
        label="Method"
        title="Six steps. Each one says what it does not do."
        lead={
          <>
            The same pipeline the server runs. The{' '}
            <Link to="/performance" className="text-signal underline decoration-signal/30 hover:decoration-signal">
              Method page
            </Link>{' '}
            shows the technology and the measured limits of each step.
          </>
        }
      >
        <ol className="divide-y divide-line border-y border-line">
          {PIPELINE.map((step, i) => (
            <li key={step.title} className="grid gap-x-8 gap-y-2 py-5 md:grid-cols-[3rem_14rem_minmax(0,1fr)_minmax(0,1fr)]">
              <span className="font-mono text-[0.75rem] text-violet">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="t-h3">{step.title}</h3>
              <p className="t-body text-[0.9375rem]">{step.does}</p>
              <p className="t-caption">
                <span className="font-medium text-steel">Cannot establish: </span>
                {step.not}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="instruments"
        number="03"
        label="Readings"
        title={
          <>
            Read them side by side. Never as one <span className="t-accent text-gradient pr-1">score.</span>
          </>
        }
        lead="Most detectors collapse everything into a verdict. VERITAS keeps each reading separate, so you can see what each one can and cannot tell you."
        tone="bg-ink-1"
      >
        <div className="grid divide-y divide-line border-y border-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {INSTRUMENTS.map((item, i) => (
            <Reveal key={item.title} delay={i * 60} className="flex flex-col gap-5 py-8 lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <p className="font-mono text-[0.75rem] text-violet">Reading {String(i + 1).padStart(2, '0')}</p>
              <div className="flex min-h-[7rem] items-center text-paper">{item.diagram}</div>
              <div>
                <h3 className="t-h2">{item.title}</h3>
                <p className="t-body mt-2 text-[0.9375rem]">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section
        id="limits"
        number="04"
        label="Limits"
        title="What this instrument is, and is not."
        lead="VERITAS is a statistical instrument for reading. It is not a fact-checking engine, and the reference collection is small. Absence of evidence is not evidence of anything."
      >
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="t-h3 border-b border-line pb-3">It does</h3>
            <ul className="divide-y divide-line">
              {DOES.map((line) => (
                <li key={line} className="py-3 text-[0.9375rem] text-steel">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="t-h3 border-b border-line pb-3">It does not</h3>
            <ul className="divide-y divide-line">
              {DOES_NOT.map((line) => (
                <li key={line} className="py-3 text-[0.9375rem] text-steel">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="t-caption mt-8 max-w-3xl">Model agreement with dataset labels is not accuracy on real-world content. The Method page defines it and the other numbers it is often confused with.</p>
      </Section>

      <section className="border-t border-line bg-ink-1" aria-label="Start">
        <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-8 px-4 py-14 sm:px-8 lg:py-16">
          <div>
            <h2 className="t-h1">Start with a case.</h2>
            <p className="t-lead mt-3">Paste your own text, or reproduce one of six invented cases from the Casebook.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to="/analyze" size="lg">
              Open an investigation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button to="/casebook" variant="secondary" size="lg">
              Browse the Casebook
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
