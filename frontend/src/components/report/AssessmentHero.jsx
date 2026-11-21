import { CircleHelp, PenLine, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { LABEL_TEXT, percent } from './reportModel'

const ICONS = { ShieldAlert, ShieldQuestion, CircleHelp, PenLine }
const TONES = {
  caution: { ring: 'border-caution/50 bg-caution/10 text-caution', glow: 'from-caution/20' },
  contra: { ring: 'border-contra/50 bg-contra/10 text-contra', glow: 'from-contra/20' },
  support: { ring: 'border-support/50 bg-support/10 text-support', glow: 'from-support/20' },
}

function Chip({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-line/80 bg-ink-1/70 px-4 py-3">
      <dt className="t-meta">{label}</dt>
      <dd className="mt-1 text-[0.9375rem] font-semibold text-paper">{value}</dd>
      <dd className="t-caption">{detail}</dd>
    </div>
  )
}

/**
 * First screen of the report: one descriptive state, one explanation, and three headline readings. The state is a
 * description of the analysis, never a verdict on the text; the sentence beneath it says so.
 */
export default function AssessmentHero({ assessment, reading, result }) {
  const Icon = ICONS[assessment.icon] ?? CircleHelp
  const tone = TONES[assessment.tone] ?? TONES.caution
  const { classification, evidence } = result
  return (
    <section aria-labelledby="assessment-title" className="glass relative overflow-hidden rounded-xl p-6 sm:p-8">
      <div aria-hidden="true" className={`pointer-events-none absolute -left-16 -top-24 h-56 w-80 rounded-full bg-gradient-to-br ${tone.glow} to-transparent blur-3xl`} />
      <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-8">
        <div className={`flex h-16 w-16 items-center justify-center rounded-xl border ${tone.ring}`}>
          <Icon className="h-8 w-8" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="t-eyebrow">Overall assessment</p>
          <h2 id="assessment-title" className="mt-2 font-display text-[clamp(1.75rem,3.4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-paper">
            {assessment.title}
          </h2>
          <p className="mt-4 max-w-3xl text-[1.0625rem] leading-relaxed text-steel">{assessment.summary}</p>
          {reading.outOfDomain && <p className="mt-3 max-w-3xl text-[0.9375rem] text-steel">{reading.styleNote}</p>}
          <p className="t-caption mt-4 max-w-3xl">This is a description of how the text was analysed, not a verdict on whether it is true.</p>
        </div>
      </div>
      <dl className="relative mt-7 grid gap-3 sm:grid-cols-3">
        <Chip
          label="Writing style"
          value={reading.outOfDomain ? 'Not meaningful here' : classification.label === 'resembles_unreliable_sources' ? 'Unreliable-like' : 'Reliable-like'}
          detail={`${percent(classification.probability_unreliable_style)} for the unreliable label`}
        />
        <Chip label="Evidence found" value={reading.relatedCount === 0 ? 'None related' : `${reading.relatedCount} related`} detail={`of ${evidence.collection_size} reference passages`} />
        <Chip label="Analysis trust" value={reading.trust.name} detail={reading.trust.advice} />
      </dl>
      <span className="sr-only">{LABEL_TEXT[classification.label]}</span>
    </section>
  )
}
