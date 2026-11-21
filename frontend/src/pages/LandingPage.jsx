import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, Check, X } from 'lucide-react'
import HeroComposer from '../components/landing/HeroComposer'
import HeroVisual from '../components/landing/HeroVisual'
import StrikeStory from '../components/landing/StrikeStory'
import { describeReadout } from '../components/layout/readoutText'
import { EvidenceDiagram, StyleDiagram, TrustDiagram } from '../components/signal/Diagrams'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Reveal from '../components/ui/Reveal'
import { EXAMPLES } from '../data/examples'
import { PIPELINE } from '../data/pipeline'

const INSTRUMENTS = [
  { title: 'Writing style', diagram: <StyleDiagram />, body: 'Does the writing resemble examples labelled reliable or unreliable in the training data? A probability for the unreliable label, with a plain-language note on what it means.', tone: 'brand' },
  { title: 'Evidence retrieval', diagram: <EvidenceDiagram />, body: 'Which reference passages are close in meaning? Each comes with its source, link and similarity. If none is close, the report says so and why that proves nothing.', tone: 'signal' },
  { title: 'Trust in the analysis', diagram: <TrustDiagram />, body: 'Short text, text unlike the training news, an undecided model or missing evidence raise caution. A confident model never lowers it.', tone: 'caution' },
]

const DOES = ['Measures how a text is written', 'Retrieves related reference passages with their sources', 'Says how far to trust its own analysis', 'Shows every limit next to every result']
const DOES_NOT = ['Decide whether a claim is true or false', 'Treat missing evidence as proof of fabrication', 'Verify individual claims', 'Turn “resembles unreliable sources” into a verdict']

function SectionHead({ eyebrow, title, children, className = '' }) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <p className="t-eyebrow">{eyebrow}</p>
      <h2 className="t-h1 mt-3">{title}</h2>
      {children && <p className="t-lead mt-4">{children}</p>}
    </div>
  )
}

export default function LandingPage() {
  const { readout } = useOutletContext() ?? {}
  const status = readout ? describeReadout(readout) : null
  const featured = EXAMPLES.find((e) => e.id === '03-misleading-sober')

  return (
    <div>
      {/* 1-2. Hero: headline, composer, motif. */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[88rem] items-center gap-x-10 gap-y-12 px-4 pb-16 pt-12 sm:px-8 lg:grid-cols-12 lg:pb-24 lg:pt-20">
          <div className="lg:col-span-7">
            <Badge tone="brand" className="py-1 pl-2 pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-violet" aria-hidden="true" />
              Transparent text analysis
            </Badge>
            <h1 className="t-display mt-6">
              Think. Question. <span className="text-gradient">Check.</span>
            </h1>
            <p className="t-lead mt-6">
              VERITAS AI measures how a text is written, retrieves related reference passages and tells you how far to trust the analysis. It never tells you that a text is true or false.
            </p>
            <div className="mt-9 max-w-2xl">
              <HeroComposer />
            </div>
            {status && (
              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2" aria-label="Live system readout">
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
          <div className="lg:col-span-5">
            <HeroVisual className="max-w-[22rem] sm:max-w-[30rem] lg:max-w-none" />
          </div>
        </div>
        <ul className="mx-auto grid max-w-[88rem] gap-3 px-4 pb-14 sm:grid-cols-3 sm:px-8" aria-label="Principles">
          {[
            ['Three separate instruments', 'Style, evidence and trust are never merged.'],
            ['Cited reference passages', 'Every passage links to its institutional source.'],
            ['Stated limits', 'Each result carries what it cannot tell you.'],
          ].map(([title, body]) => (
            <li key={title} className="glass rounded-lg px-5 py-4">
              <p className="text-sm font-semibold text-paper">{title}</p>
              <p className="t-caption mt-0.5">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. The strike-through story. */}
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

      {/* 4. How it works. */}
      <section id="how" className="mx-auto max-w-[88rem] scroll-mt-20 px-4 py-20 sm:px-8 lg:py-28">
        <SectionHead eyebrow="How VERITAS works" title="Six steps. Each one says what it does not do.">
          The pipeline is the same one the server runs. The report shows the output of each step separately.
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
                  <span className="sr-only">Does not: </span>
                  {step.not}
                </span>
              </p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* 5. Three instruments. */}
      <section id="instruments" className="border-y border-line bg-ink-1/70">
        <div className="mx-auto max-w-[88rem] scroll-mt-20 px-4 py-20 sm:px-8 lg:py-28">
          <SectionHead eyebrow="Three analytical instruments" title="Read them side by side. Never as one score.">
            Most detectors collapse everything into a verdict. VERITAS keeps each reading separate, so you can see what each one can and cannot tell you.
          </SectionHead>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {INSTRUMENTS.map((item, i) => (
              <Reveal key={item.title} delay={i * 60} className="panel panel-hover flex flex-col p-6">
                <Badge tone={item.tone} className="self-start">
                  Instrument {i + 1}
                </Badge>
                <div className="my-6 flex min-h-[7rem] items-center text-paper">{item.diagram}</div>
                <h3 className="t-h2">{item.title}</h3>
                <p className="t-body mt-2 text-[0.9375rem]">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6-7. Evidence and transparency, shown with a recorded case. */}
      <section className="mx-auto max-w-[88rem] px-4 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-x-14 gap-y-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="t-eyebrow">Evidence and transparency</p>
            <h2 className="t-h1 mt-3">A false claim, written calmly.</h2>
            <p className="t-body mt-5">This demo input claims a lemon-and-honey drink cures influenza in a day and makes vaccination unnecessary. That is false. It is written like ordinary news, and the classifier did not catch it.</p>
            <blockquote className="mt-7 border-l-2 border-violet/60 pl-5 text-[0.9375rem] leading-relaxed text-steel">
              {featured.text.split('\n')[0].slice(0, 230)}…
            </blockquote>
            <p className="t-caption mt-3">Demo input, invented for demonstration.</p>
          </Reveal>
          <Reveal delay={80} className="lg:col-span-7">
            <div className="glass overflow-hidden rounded-xl">
              <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3">
                <p className="text-sm font-semibold text-paper">What the instruments recorded</p>
                <Badge>Recorded 2026-11-20</Badge>
              </div>
              <dl className="divide-y divide-line/70 text-[0.9375rem]">
                {[
                  ['Writing style', 'Resembles sources labelled reliable. Model probability for “unreliable”: 21%.', 'brand'],
                  ['Evidence retrieval', 'Influenza and vaccination passages retrieved. None addresses this specific claim.', 'signal'],
                  ['Trust in the analysis', 'Moderate caution. No specific warning raised.', 'caution'],
                ].map(([k, v, tone]) => (
                  <div key={k} className="grid gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[11rem_1fr]">
                    <dt>
                      <Badge tone={tone}>{k}</Badge>
                    </dt>
                    <dd className="text-steel">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-line/70 px-5 py-4 text-[0.875rem] text-steel">
                The interface says no more than this. Model confidence is not factual certainty and retrieved passages show relevance only. A reader still has to check the claim.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button to="/analyze" state={{ example: featured.id }} variant="secondary">
                Run this case
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <p className="t-caption">Recorded from the live system (docs/samples). Reproduce it yourself.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8. Limitations and responsible AI. */}
      <section id="limits" className="scroll-mt-20 border-y border-line bg-ink-1/70">
        <div className="mx-auto max-w-[88rem] px-4 py-20 sm:px-8 lg:py-28">
          <SectionHead eyebrow="Responsible AI" title="What this instrument is, and is not.">
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
          <p className="t-caption mt-6 max-w-3xl">
            Model agreement with dataset labels is not accuracy on real-world content. See the{' '}
            <Link to="/performance" className="text-signal underline decoration-signal/30 hover:decoration-signal">
              Method page
            </Link>{' '}
            for the measured numbers and the limits that come with them.
          </p>
        </div>
      </section>

      {/* 9. Final call to action. */}
      <section className="mx-auto max-w-[88rem] px-4 py-20 sm:px-8 lg:py-28">
        <Reveal className="glass relative overflow-hidden rounded-2xl px-6 py-14 text-center sm:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-brand/30 blur-3xl" />
          <h2 className="t-h1 relative mx-auto max-w-2xl">Start with a case.</h2>
          <p className="t-lead relative mx-auto mt-4 max-w-xl">Paste your own text or load one of six invented demo inputs. Nothing is saved.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/analyze" size="lg" magnetic>
              Open an investigation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button to="/performance" variant="secondary" size="lg">
              Read the method and its limits
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
