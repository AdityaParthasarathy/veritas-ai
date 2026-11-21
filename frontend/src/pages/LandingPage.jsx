import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowRight, Check, X } from 'lucide-react'
import InvestigationPanel from '../components/investigate/InvestigationPanel'
import StrikeStory from '../components/landing/StrikeStory'
import WaveField from '../components/landing/WaveField'
import { describeReadout } from '../components/layout/readoutText'
import { EvidenceDiagram, StyleDiagram, TrustDiagram } from '../components/signal/Diagrams'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Reveal from '../components/ui/Reveal'
import Skeleton from '../components/ui/Skeleton'
import { PIPELINE } from '../data/pipeline'

const SampleReport = lazy(() => import('../components/landing/SampleReport'))

const INSTRUMENTS = [
  { title: 'Writing-style reading', diagram: <StyleDiagram />, body: 'Does the writing resemble examples labelled reliable or unreliable in the training data? You get the label and the model probability, with a note on what that number is not.', tone: 'brand' },
  { title: 'Evidence retrieval', diagram: <EvidenceDiagram />, body: 'Which reference passages are close in meaning? Each comes with its source, link and similarity. If none is close, the report says so and why that proves nothing.', tone: 'signal' },
  { title: 'Trust in the analysis', diagram: <TrustDiagram />, body: 'Short text, text unlike the training news, an undecided model or missing evidence raise caution. A confident model never lowers it.', tone: 'caution' },
]

const BENTO = ['lg:col-span-4', 'lg:col-span-2', 'lg:col-span-6']
const DOES = ['Measures how a text is written', 'Retrieves related reference passages with their sources', 'Says how far to trust its own analysis', 'Shows every limit next to every result']
const DOES_NOT = ['Decide whether a claim is true or false', 'Treat missing evidence as proof of fabrication', 'Verify individual claims', 'Turn “resembles unreliable sources” into a verdict']
const EMPTY = { mode: 'text', title: '', text: '', url: '' }

function SectionHead({ eyebrow, title, children }) {
  return (
    <div className="max-w-2xl">
      <p className="t-eyebrow">{eyebrow}</p>
      <h2 className="t-h1 mt-3">{title}</h2>
      {children && <p className="t-lead mt-4">{children}</p>}
    </div>
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
      {/* 1. Hero and investigation input. */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="hero-beam pointer-events-none absolute inset-0" />
        <WaveField className="pointer-events-none absolute inset-x-0 top-[34rem] h-64 w-full opacity-70" />
        <div className="relative mx-auto max-w-[88rem] px-4 pt-10 sm:px-8 lg:pt-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <Badge tone="brand" className="py-1 pl-2 pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-violet" aria-hidden="true" />
              Transparent text analysis
            </Badge>
            <h1 className="t-hero mt-6">
              Think. Question. <span className="text-gradient">Check.</span>
            </h1>
            <p className="t-lead mt-6">VERITAS AI examines how information is written, retrieves related reference material, and shows you how much confidence to place in its own analysis.</p>
            <p className="mt-3 max-w-xl text-[0.875rem] text-dim">It does not independently decide whether a claim is true or false.</p>
            <div className="mt-8 w-full max-w-2xl text-left">
              <InvestigationPanel
                value={value}
                onChange={(next) => setValue((current) => ({ ...current, ...next }))}
                touched={touched}
                onTouch={setTouched}
                onClear={() => setValue(EMPTY)}
                onSubmit={() => navigate('/analyze', { state: { draft: { mode: value.mode, title: '', text: value.text, url: value.url.trim() } } })}
              />
            </div>
            {status && (
              <dl className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2" aria-label="Live system readout">
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
          <div className="mt-20 lg:mt-28">
            <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-5xl" />}>
              <SampleReport />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 2. The signature strike-through story. */}
      <section className="border-y border-line bg-ink-1/70" aria-labelledby="story-title">
        <div className="mx-auto max-w-[88rem] px-4 py-20 sm:px-8 lg:py-28">
          <p className="t-eyebrow">The difference between information and checked information</p>
          <h2 id="story-title" className="sr-only">
            Every reflex, struck and replaced
          </h2>
          <div className="mt-8">
            <StrikeStory />
          </div>
        </div>
      </section>

      {/* 3. How it works. */}
      <section id="how" className="mx-auto max-w-[88rem] scroll-mt-20 px-4 py-20 sm:px-8 lg:py-28">
        <SectionHead eyebrow="How VERITAS works" title="Six steps. Each one says what it does not do.">
          The same pipeline the server runs. The{' '}
          <Link to="/performance" className="text-signal underline decoration-signal/30 hover:decoration-signal">
            Method page
          </Link>{' '}
          shows the technology and the measured limits of each step.
        </SectionHead>
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 50} className="panel panel-hover p-6">
              <span className="font-mono text-[0.75rem] text-violet">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="t-h3 mt-3">{step.title}</h3>
              <p className="t-body mt-2 text-[0.9375rem]">{step.does}</p>
              <p className="t-caption mt-3 flex gap-2 border-t border-line pt-3">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-contra" aria-hidden="true" />
                <span>
                  <span className="font-medium text-steel">Cannot establish: </span>
                  {step.not}
                </span>
              </p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* 4. Three instruments. */}
      <section id="instruments" className="border-y border-line bg-ink-1/70">
        <div className="mx-auto max-w-[88rem] scroll-mt-20 px-4 py-20 sm:px-8 lg:py-28">
          <SectionHead eyebrow="Three analytical instruments" title={<>Read them side by side. Never as one <span className="t-accent text-gradient pr-1">score.</span></>}>
            Most detectors collapse everything into a verdict. VERITAS keeps each reading separate, so you can see what each one can and cannot tell you.
          </SectionHead>
          <div className="mt-12 grid gap-5 lg:grid-cols-6">
            {INSTRUMENTS.map((item, i) => (
              <Reveal key={item.title} delay={i * 60} className={`panel panel-hover flex flex-col p-6 ${BENTO[i]}`}>
                <Badge tone={item.tone} className="self-start">
                  Instrument {String(i + 1).padStart(2, '0')}
                </Badge>
                <div className={i === 2 ? 'flex flex-1 flex-col gap-6 md:flex-row md:items-center md:gap-12' : 'flex flex-1 flex-col'}>
                  <div className="my-6 flex min-h-[7rem] items-center text-paper md:my-4 md:min-w-[16rem]">{item.diagram}</div>
                  <div>
                    <h3 className="t-h2">{item.title}</h3>
                    <p className="t-body mt-2 text-[0.9375rem]">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Transparency and limitations. */}
      <section id="limits" className="scroll-mt-20 border-y border-line bg-ink-1/70">
        <div className="mx-auto max-w-[88rem] px-4 py-20 sm:px-8 lg:py-28">
          <SectionHead eyebrow="Transparency and limitations" title="What this instrument is, and is not.">
            VERITAS is a statistical instrument for reading. It is not a fact-checking engine, and the reference collection is small. Absence of evidence is not evidence of anything.
          </SectionHead>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <Reveal className="panel p-6">
              <h3 className="t-h3 text-support">It does</h3>
              <ul className="mt-4 space-y-3">
                {DOES.map((line) => (
                  <li key={line} className="flex gap-3 text-[0.9375rem] text-steel">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-support" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={60} className="panel p-6">
              <h3 className="t-h3 text-contra">It does not</h3>
              <ul className="mt-4 space-y-3">
                {DOES_NOT.map((line) => (
                  <li key={line} className="flex gap-3 text-[0.9375rem] text-steel">
                    <X className="mt-1 h-4 w-4 shrink-0 text-contra" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <p className="t-caption mt-6 max-w-3xl">Model agreement with dataset labels is not accuracy on real-world content. The Method page defines it and the other numbers it is often confused with.</p>
        </div>
      </section>

      {/* 7. Final call to action. */}
      <section className="mx-auto max-w-[88rem] px-4 py-20 sm:px-8 lg:py-28">
        <Reveal className="glass relative overflow-hidden rounded-2xl px-6 py-14 text-center sm:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-brand/25 blur-3xl" />
          <h2 className="t-h1 relative mx-auto max-w-2xl">Start with a case.</h2>
          <p className="t-lead relative mx-auto mt-4 max-w-xl">Paste your own text, or reproduce one of six invented cases from the Casebook.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/analyze" size="lg" magnetic>
              Open an investigation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button to="/casebook" variant="secondary" size="lg">
              Browse the Casebook
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
