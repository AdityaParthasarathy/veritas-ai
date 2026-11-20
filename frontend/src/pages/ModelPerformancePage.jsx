import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import { describeError } from '../services/analysisService'
import { getPerformance } from '../services/performanceService'

const pct = (v) => `${(v * 100).toFixed(1)}%`
const VARIANT_NAMES = { baseline: 'Baseline', source_masked: 'Source-masked' }

function ConfusionMatrix({ matrix }) {
  const { labels, matrix: m } = matrix
  const max = Math.max(...m.flat())
  return (
    <div>
      <div className="mb-1 text-center text-xs text-veritas-dim">Predicted</div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-sm">
        <div />
        {labels.map((l) => (
          <div key={l} className="text-center text-xs capitalize text-veritas-muted">{l}</div>
        ))}
        {m.map((row, i) => (
          <div key={labels[i]} className="contents">
            <div className="flex items-center pr-2 text-xs capitalize text-veritas-muted [writing-mode:horizontal-tb]">True {labels[i]}</div>
            {row.map((value, j) => (
              <div
                key={j}
                className="rounded-md py-4 text-center font-mono text-veritas-text"
                style={{ background: `rgba(139, 124, 255, ${(0.08 + 0.5 * (value / max)).toFixed(2)})` }}
                title={`${value} articles`}
              >
                {value.toLocaleString()}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ModelPerformancePage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [variantKey, setVariantKey] = useState('source_masked')

  useEffect(() => {
    let cancelled = false
    getPerformance()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(describeError(err)))
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <>
        <PageHeader title="Model Performance" />
        <div role="alert" className="rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3.5 text-sm text-veritas-error">{error}</div>
      </>
    )
  }
  if (!data) return <p className="text-sm text-veritas-muted">Loading…</p>

  const variant = data.variants.find((v) => v.variant === variantKey) ?? data.variants[0]
  const test = variant.test
  const chartData = ['precision', 'recall', 'f1'].map((metric) => ({
    metric: metric === 'f1' ? 'F1' : metric[0].toUpperCase() + metric.slice(1),
    Real: test.per_class.real[metric],
    Fake: test.per_class.fake[metric],
  }))
  const c = data.cleaning

  return (
    <>
      <PageHeader
        title="Model Performance"
        description="How the TF-IDF + Logistic Regression classifier performs on held-out articles from its own dataset, and what that does and does not tell you."
        action={<StatusBadge tone="warning">Agreement with dataset labels</StatusBadge>}
      />

      <div role="note" className="mb-6 flex gap-3 rounded-lg border border-veritas-warning/30 bg-veritas-warning-light p-4 text-sm leading-relaxed text-veritas-warning">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{data.interpretation}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {data.variants.map((v) => (
          <button
            key={v.variant}
            type="button"
            onClick={() => setVariantKey(v.variant)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              v.variant === variant.variant ? 'bg-veritas-primary-light text-veritas-text' : 'bg-white/5 text-veritas-muted hover:text-veritas-text'
            }`}
          >
            {VARIANT_NAMES[v.variant] ?? v.variant}
          </button>
        ))}
      </div>
      <p className="mb-5 max-w-3xl text-xs text-veritas-dim">{variant.description}</p>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-veritas-text">Test set (held-out)</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-veritas-muted">Accuracy</dt><dd className="font-mono text-veritas-text">{pct(test.accuracy)}</dd></div>
            <div className="flex justify-between"><dt className="text-veritas-muted">Macro precision</dt><dd className="font-mono text-veritas-text">{pct(test.macro_avg.precision)}</dd></div>
            <div className="flex justify-between"><dt className="text-veritas-muted">Macro recall</dt><dd className="font-mono text-veritas-text">{pct(test.macro_avg.recall)}</dd></div>
            <div className="flex justify-between"><dt className="text-veritas-muted">Macro F1</dt><dd className="font-mono text-veritas-text">{pct(test.macro_avg.f1)}</dd></div>
            <div className="flex justify-between border-t border-veritas-border-subtle pt-2"><dt className="text-veritas-muted">Validation accuracy</dt><dd className="font-mono text-veritas-text">{pct(variant.validation.accuracy)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-veritas-dim">Regularisation C = {variant.selected_C}, chosen on the validation split only. {variant.vocabulary_size.toLocaleString()} n-gram features.</p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-veritas-text">Precision, recall and F1 by class</h2>
          <p className="mb-3 text-xs text-veritas-dim">Vertical axis starts at 0.90 to make differences visible.</p>
          <div className="h-56" role="img" aria-label="Grouped bar chart of precision, recall and F1 for the real and fake classes">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="rgba(154,168,188,0.12)" vertical={false} />
                <XAxis dataKey="metric" stroke="#9AA8BC" tick={{ fontSize: 12 }} />
                <YAxis domain={[0.9, 1]} stroke="#9AA8BC" tick={{ fontSize: 12 }} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip formatter={(v) => v.toFixed(4)} contentStyle={{ background: '#141E30', border: '1px solid #1F2C44', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Real" fill="#42D9E8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Fake" fill="#8B7CFF" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-veritas-text">Confusion matrix (test)</h2>
          <ConfusionMatrix matrix={test.confusion_matrix} />
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-veritas-text">Highest-weight features</h2>
          <p className="mb-3 text-xs text-veritas-dim">Words and phrases that push predictions most strongly. Many are publisher or formatting cues, not claims.</p>
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div><div className="mb-1.5 font-medium text-veritas-muted">Towards “fake” label</div><p className="font-mono leading-relaxed text-veritas-text">{variant.top_features.most_fake.slice(0, 12).join(' · ')}</p></div>
            <div><div className="mb-1.5 font-medium text-veritas-muted">Towards “real” label</div><p className="font-mono leading-relaxed text-veritas-text">{variant.top_features.most_real.slice(0, 12).join(' · ')}</p></div>
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold tracking-tight text-veritas-text">Dataset</h2>
      <Card>
        <p className="text-sm text-veritas-muted">
          {data.dataset_name} ({data.dataset_license}) ·{' '}
          <a href={data.dataset_source} target="_blank" rel="noopener noreferrer" className="text-veritas-cyan hover:underline">{data.dataset_source}</a>
        </p>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-veritas-dim">Raw rows</div><div className="font-mono text-veritas-text">{c.raw_rows.toLocaleString()}</div></div>
          <div><div className="text-xs text-veritas-dim">Removed: empty/very short text</div><div className="font-mono text-veritas-text">{c.dropped_empty_content.toLocaleString()}</div></div>
          <div><div className="text-xs text-veritas-dim">Removed: duplicates</div><div className="font-mono text-veritas-text">{(c.dropped_exact_duplicates + c.dropped_duplicate_text).toLocaleString()}</div></div>
          <div><div className="text-xs text-veritas-dim">Used</div><div className="font-mono text-veritas-text">{c.final_rows.toLocaleString()}</div></div>
        </div>
        <p className="mt-4 text-xs text-veritas-dim">
          Split ({data.split_strategy}):{' '}
          {Object.entries(data.split_sizes).map(([name, s]) => `${name} ${s.rows.toLocaleString()}`).join(' · ')}. Leakage check: {data.leakage_check}. {data.label_convention}.
        </p>
      </Card>

      <h2 className="mb-3 mt-10 text-lg font-semibold tracking-tight text-veritas-text">Limitations</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {data.limitations.map((l) => (
          <li key={l.title}>
            <Card className="h-full">
              <h3 className="text-sm font-semibold text-veritas-text">{l.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-veritas-muted">{l.detail}</p>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-veritas-dim">Metrics generated {new Date(data.generated_at).toLocaleString()} by the training script; nothing on this page is entered by hand.</p>
    </>
  )
}
