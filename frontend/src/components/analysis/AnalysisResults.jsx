import { AlertTriangle, BookOpenCheck, Brain, Ruler } from 'lucide-react'
import Card from '../common/Card'
import StatusBadge from '../common/StatusBadge'
import EvidencePassage from './EvidencePassage'

const LABELS = {
  resembles_unreliable_sources: 'Resembles content from sources labelled unreliable',
  resembles_reliable_sources: 'Resembles content from sources labelled reliable',
}
const LEVELS = {
  moderate: { tone: 'warning', text: 'Moderate uncertainty' },
  high: { tone: 'warning', text: 'High uncertainty' },
  very_high: { tone: 'error', text: 'Very high uncertainty' },
}

function SectionTitle({ icon: Icon, title, kind }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-lg bg-white/5 p-2 text-veritas-muted">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-veritas-text">{title}</h2>
        <p className="text-xs text-veritas-dim">{kind}</p>
      </div>
    </div>
  )
}

function UncertaintyCard({ uncertainty }) {
  const level = LEVELS[uncertainty.level]
  return (
    <Card className="border-veritas-warning/30">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-veritas-text">
          <AlertTriangle className="h-4 w-4 text-veritas-warning" strokeWidth={1.75} />
          Uncertainty
        </div>
        <StatusBadge tone={level.tone}>{level.text}</StatusBadge>
      </div>
      {uncertainty.reasons.length > 0 && (
        <ul className="mb-3 space-y-1.5 text-sm text-veritas-muted">
          {uncertainty.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-veritas-warning" />
              {reason}
            </li>
          ))}
        </ul>
      )}
      <details className="text-xs text-veritas-dim">
        <summary className="cursor-pointer select-none text-veritas-muted hover:text-veritas-text">Always-applicable limitations</summary>
        <ul className="mt-2 space-y-1.5 leading-relaxed">
          {uncertainty.standing_caveats.map((caveat) => (
            <li key={caveat}>• {caveat}</li>
          ))}
        </ul>
      </details>
    </Card>
  )
}

export default function AnalysisResults({ result }) {
  const { classification, linguistic_signals: signals, evidence, uncertainty } = result
  const pct = Math.round(classification.probability_unreliable_style * 100)

  return (
    <div className="mt-8 space-y-5">
      <div role="note" className="rounded-lg border border-veritas-border-subtle bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-veritas-muted">
        {result.disclaimer}
      </div>

      <UncertaintyCard uncertainty={uncertainty} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={Brain} title="Model classification" kind="Machine-learning output · not evidence" />
          <p className="text-sm font-medium text-veritas-text">{LABELS[classification.label]}</p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-veritas-dim">
              <span>Resembles reliable</span>
              <span>Resembles unreliable</span>
            </div>
            <div
              className="relative h-2 rounded-full bg-white/10"
              role="meter"
              aria-label="Probability of resembling unreliable-source content"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
              <div className="h-2 rounded-full bg-veritas-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-veritas-muted">
              Model probability for the “unreliable” label: <span className="font-mono text-veritas-text">{pct}%</span>
            </p>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-veritas-dim">{classification.disclaimer}</p>
          <p className="mt-3 border-t border-veritas-border-subtle pt-3 text-xs text-veritas-dim">
            {classification.model.name}, trained on {classification.model.trained_on}.
            {classification.model.test_accuracy_on_dataset_labels != null &&
              ` Agreement with dataset labels on held-out articles from the same dataset: ${(classification.model.test_accuracy_on_dataset_labels * 100).toFixed(1)}%. This is not accuracy on real-world content.`}
          </p>
        </Card>

        <Card>
          <SectionTitle icon={Ruler} title="Linguistic signals" kind="Descriptive measurements · not a score" />
          <dl className="divide-y divide-veritas-border-subtle">
            {signals.map((signal) => (
              <div key={signal.key} className="flex items-baseline justify-between gap-4 py-2" title={signal.description}>
                <dt className="text-sm text-veritas-muted">{signal.label}</dt>
                <dd className="text-right font-mono text-sm text-veritas-text">
                  {signal.value}
                  <span className="ml-1.5 font-sans text-[11px] text-veritas-dim">{signal.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-veritas-dim">Hover a row for what it measures. These are not used by the classifier and do not indicate truthfulness.</p>
        </Card>
      </div>

      <Card>
        <SectionTitle icon={BookOpenCheck} title="Related reference passages" kind={`Independent retrieval from "${evidence.collection_name}" (${evidence.collection_size} passages)`} />
        {evidence.hits.some((hit) => hit.relevant) ? (
          <ul className="space-y-3">
            {evidence.hits.map((hit) => (
              <EvidencePassage key={hit.id} hit={hit} />
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-white/5 p-3 text-sm text-veritas-muted">
            No passage in the reference collection is clearly related to this text. The collection is small, so this does not indicate anything about accuracy.
          </p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-veritas-dim">{evidence.disclaimer}</p>
      </Card>
    </div>
  )
}
