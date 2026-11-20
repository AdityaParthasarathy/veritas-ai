import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { describeReadout } from '../components/layout/readoutText'
import { EvidenceDiagram, SignalsDiagram, StyleDiagram, TrustDiagram } from '../components/signal/Diagrams'
import SignalField from '../components/signal/SignalField'
import Button from '../components/ui/Button'
import Reveal from '../components/ui/Reveal'
import { EXAMPLES } from '../data/examples'

const READINGS = [
  {
    title: 'Style reading',
    diagram: <StyleDiagram />,
    body: 'A classifier trained on one dataset reports whether the writing resembles sources labelled unreliable or reliable. It reads style and source habits, not facts.',
  },
  {
    title: 'Linguistic indicators',
    diagram: <SignalsDiagram />,
    body: 'Twelve plain measurements: emphasis, ALL-CAPS, sensational and hedging wording, attribution, named entities. Counts, not conclusions.',
  },
  {
    title: 'Reference passages',
    diagram: <EvidenceDiagram />,
    body: 'The text is compared by meaning with a curated library of paraphrased institutional passages. You get the passage, the similarity and the source link. Whether it supports or contradicts the text is not assessed.',
  },
  {
    title: 'Trust in the analysis',
    diagram: <TrustDiagram />,
    body: 'Short text, text unlike the training news, an undecided model or missing evidence raise the level of caution. A confident model never lowers it.',
  },
]

export default function LandingPage() {
  const { readout } = useOutletContext() ?? {}
  const status = readout ? describeReadout(readout) : null
  const featured = EXAMPLES.find((e) => e.id === '03-misleading-sober')

  return (
    <div>
      {/* First viewport: the mechanism, demonstrated. */}
      <section className="relative border-b border-line">
        <div className="grid lg:grid-cols-[minmax(0,42rem)_1fr]">
          <div className="relative z-10 px-4 pb-10 pt-14 sm:px-8 lg:pb-24 lg:pl-[max(2rem,calc((100vw-88rem)/2+2rem))] lg:pr-10 lg:pt-24">
            <h1 className="t-display">Separate the signal from the noise.</h1>
            <p className="t-lead mt-7">Veritas reads a piece of text the way an editor reads a proof. It measures how it is written, finds the reference material it can, and says how far to trust any of it. It never tells you a text is true.</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button to="/analyze" size="lg" magnetic>
                Open an investigation
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <a href="#readings" className="text-[0.9375rem] text-steel underline decoration-line-strong underline-offset-4 transition-colors duration-fast hover:text-paper hover:decoration-signal">
                How it reasons
              </a>
            </div>
            {status && (
              <dl className="mt-12 flex flex-wrap gap-x-8 gap-y-2" aria-label="Live system readout">
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
          <div className="relative min-h-[26rem] border-t border-line bg-ink-1 sm:min-h-[30rem] lg:min-h-[40rem] lg:border-l lg:border-t-0">
            <SignalField variant="hero" className="absolute inset-0" />
            <p className="t-meta pointer-events-none absolute inset-x-4 bottom-3 flex justify-between gap-4 sm:inset-x-6">
              <span>Synthetic demonstration: invented text</span>
              <span className="hidden sm:inline">Move the pointer to resolve the lines</span>
            </p>
          </div>
        </div>
      </section>

      {/* The four readings. */}
      <section id="readings" className="mx-auto max-w-[88rem] scroll-mt-16 px-4 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <h2 className="t-h1">Four readings. Never one score.</h2>
              <p className="t-body mt-5">Most detectors collapse everything into a verdict. Veritas keeps each instrument separate, so you can see what each one can and cannot tell you.</p>
            </div>
          </Reveal>
          <div className="lg:col-span-8">
            {READINGS.map((reading, i) => (
              <Reveal key={reading.title} delay={i * 50} className="grid items-center gap-x-10 gap-y-4 border-t border-line py-8 first:border-t-0 first:pt-0 sm:grid-cols-[15rem_1fr]">
                <div className="text-paper">{reading.diagram}</div>
                <div>
                  <h3 className="t-h2">{reading.title}</h3>
                  <p className="t-body mt-2">{reading.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* A recorded case where the instrument says less than you might want. */}
      <section className="border-y border-line bg-ink-1">
        <div className="mx-auto grid max-w-[88rem] gap-x-16 gap-y-10 px-4 py-20 sm:px-8 lg:grid-cols-12 lg:py-28">
          <Reveal className="lg:col-span-6">
            <h2 className="t-h1">A false claim, written calmly.</h2>
            <p className="t-body mt-5">This demo input claims a lemon-and-honey drink cures influenza in a day and makes vaccination unnecessary. That is false. It is written like ordinary news, and the classifier did not catch it.</p>
            <blockquote className="t-galley mt-8 border-l border-line-strong pl-6 text-paper/90">
              {featured.text.split('\n')[0].slice(0, 230)}…
            </blockquote>
            <p className="t-caption mt-3">Demo input, invented for demonstration.</p>
          </Reveal>
          <Reveal delay={80} className="lg:col-span-6 lg:pl-6">
            <h3 className="t-h3">What the instruments recorded</h3>
            <dl className="mt-5 divide-y divide-line border-y border-line text-[0.9375rem]">
              {[
                ['Style reading', 'Resembles sources labelled reliable. Model probability for “unreliable”: 21%.'],
                ['Trust in the analysis', 'Moderate caution. No specific warning raised.'],
                ['Reference passages', 'Influenza and vaccination passages retrieved. None addresses this specific claim.'],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-x-6 py-3.5 sm:grid-cols-[11rem_1fr]">
                  <dt className="text-dim">{k}</dt>
                  <dd className="text-steel">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="t-body mt-6">
              The interface does not claim more than this. It states that model confidence is not factual certainty and that retrieved passages show relevance only. A reader still has to check the claim.
            </p>
            <p className="t-caption mt-3">Recorded from the live system on 2026-11-20 (docs/samples). Reproduce it yourself below.</p>
            <div className="mt-6">
              <Button to="/analyze" state={{ example: featured.id }} variant="secondary">
                Run this case
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Principles, set as statements. */}
      <section className="mx-auto max-w-[88rem] px-4 py-20 sm:px-8 lg:py-28">
        <div className="space-y-12 lg:space-y-16">
          {[
            ['Information is questioned, not trusted.', 'Every result arrives with its limits: what the model was trained on, what it cannot see, and when its reading is outside its domain.', 'lg:ml-0'],
            ['Evidence outranks presentation.', 'Passages come with their source and their similarity score. The interface shows the match, never a conclusion drawn from it.', 'lg:ml-[16%]'],
            ['Confidence is not truth.', 'A model can be certain and wrong. Veritas reports how sure the model is separately from how far the analysis can be trusted.', 'lg:ml-[32%]'],
          ].map(([statement, body, offset], i) => (
            <Reveal key={statement} delay={i * 40} className={`max-w-3xl ${offset}`}>
              <Reveal as="p" variant="wipe" className="font-display text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] tracking-[-0.02em] text-paper" style={{ fontVariationSettings: "'opsz' 60" }}>
                {statement}
              </Reveal>
              <p className="t-body mt-3">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Close. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[88rem] px-4 py-16 sm:px-8 lg:py-24">
          <Reveal className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <h2 className="t-h1">Start with a case.</h2>
              <p className="t-body mt-4">Load one of six invented demo inputs, or paste your own. Nothing is saved unless you are signed in.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button to="/analyze" size="lg" magnetic>
                  Open an investigation
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button to="/performance" variant="ghost" size="lg">
                  Read the method and its limits
                </Button>
              </div>
            </div>
            <ul className="lg:col-span-6" aria-label="Demo inputs">
              {EXAMPLES.map((example) => (
                <li key={example.id} className="border-t border-line first:border-t-0 lg:first:border-t">
                  <Link to="/analyze" state={{ example: example.id }} className="press group flex items-baseline justify-between gap-4 py-3 hover:bg-ink-1">
                    <span className="text-[0.9375rem] text-paper">{example.title}</span>
                    <span className="t-meta transition-colors group-hover:text-signal">{example.kind}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
