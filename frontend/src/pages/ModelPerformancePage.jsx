import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { X } from 'lucide-react'
import Skeleton from '../components/ui/Skeleton'
import Tabs from '../components/ui/Tabs'
import { PIPELINE } from '../data/pipeline'
import { colors } from '../design/tokens'
import { describeError } from '../services/analysisService'
import { getPerformance } from '../services/performanceService'

const pct = (v) => `${(v * 100).toFixed(1)}%`
const VARIANT_NAMES = { baseline: 'Baseline', source_masked: 'Source-masked' }

function ConfusionMatrix({ matrix }) {
  const { labels, matrix: m } = matrix
  const max = Math.max(...m.flat())
  return (
    <table className="w-full max-w-md border-separate border-spacing-1 text-sm">
      <caption className="t-caption pb-2 text-left">Rows are the true label, columns the predicted label. Test split.</caption>
      <thead>
        <tr>
          <td />
          {labels.map((l) => (
            <th key={l} scope="col" className="pb-1 text-center text-[0.8125rem] font-medium capitalize text-steel">
              Predicted {l}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {m.map((row, i) => (
          <tr key={labels[i]}>
            <th scope="row" className="pr-2 text-left text-[0.8125rem] font-medium capitalize text-steel">
              True {labels[i]}
            </th>
            {row.map((value, j) => (
              <td key={j} className="rounded-sm py-5 text-center font-mono text-paper" style={{ background: `rgba(118, 84, 246, ${(0.1 + 0.55 * (value / max)).toFixed(2)})` }}>
                {value.toLocaleString()}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Pipeline() {
  return (
    <section aria-labelledby="h-pipeline" className="mb-14">
      <h2 id="h-pipeline" className="t-h2">
        How an analysis is made
      </h2>
      <p className="t-caption mb-6 mt-1">The same six steps the server runs. Each one states what it does not do.</p>
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PIPELINE.map((step, i) => (
          <li key={step.title} className="panel panel-hover p-5">
            <span className="font-mono text-[0.75rem] text-violet">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="t-h3 mt-2">{step.title}</h3>
            <p className="t-body mt-1.5 text-[0.875rem]">{step.does}</p>
            <p className="t-caption mt-3 flex gap-2 border-t border-line pt-3">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-contra" aria-hidden="true" />
              <span>
                <span className="sr-only">Does not: </span>
                {step.not}
              </span>
            </p>
          </li>
        ))}
      </ol>
    </section>
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

  const shell = (children) => <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">{children}</div>

  if (error) {
    return shell(
      <>
        <h1 className="t-h1">Method</h1>
        <div className="mt-8"><Pipeline /></div>
        <div role="alert" className="mt-6 rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
          {error}
        </div>
      </>,
    )
  }
  if (!data) {
    return shell(
      <div role="status" aria-label="Loading model metrics" className="space-y-5">
        <Skeleton className="h-14 w-1/2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>,
    )
  }

  const variant = data.variants.find((v) => v.variant === variantKey) ?? data.variants[0]
  const test = variant.test
  const chartData = ['precision', 'recall', 'f1'].map((metric) => ({
    metric: metric === 'f1' ? 'F1' : metric[0].toUpperCase() + metric.slice(1),
    Real: test.per_class.real[metric],
    Fake: test.per_class.fake[metric],
  }))
  const c = data.cleaning
  const tabs = data.variants.map((v) => ({ id: v.variant, label: VARIANT_NAMES[v.variant] ?? v.variant }))

  return shell(
    <>
      <div className="mb-12 max-w-4xl">
        <p className="t-eyebrow mb-2">Method</p>
        <h1 className="t-h1">Method, measured and limited</h1>
        <p className="mt-5 text-[1.25rem] leading-snug tracking-[-0.01em] text-steel">{data.interpretation}</p>
      </div>

      <Pipeline />

      <Tabs tabs={tabs} value={variant.variant} onChange={setVariantKey} label="Model variant" idPrefix="variant" />
      <div id="variant-panel" role="tabpanel" aria-labelledby={`variant-tab-${variant.variant}`}>
        <p className="t-body mb-10 mt-4">{variant.description}</p>

        <div className="grid gap-6 lg:grid-cols-12">
          <section aria-labelledby="h-test" className="panel p-6 lg:col-span-4">
            <h2 id="h-test" className="t-h2">
              Held-out test set
            </h2>
            <dl className="mt-4 divide-y divide-line border-y border-line">
              {[
                ['Agreement with labels (accuracy)', pct(test.accuracy)],
                ['Macro precision', pct(test.macro_avg.precision)],
                ['Macro recall', pct(test.macro_avg.recall)],
                ['Macro F1', pct(test.macro_avg.f1)],
                ['Validation accuracy', pct(variant.validation.accuracy)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-[0.875rem] text-steel">{k}</dt>
                  <dd className="t-data text-lg">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="t-caption mt-3">
              Regularisation C = {variant.selected_C}, chosen on the validation split only. {variant.vocabulary_size.toLocaleString()} n-gram features.
            </p>
          </section>

          <section aria-labelledby="h-chart" className="panel p-6 lg:col-span-8">
            <h2 id="h-chart" className="t-h2">
              Precision, recall and F1 by class
            </h2>
            <p className="t-caption mb-4 mt-1">The vertical axis starts at 0.90 so the differences are visible. Numbers are exact in the tooltip.</p>
            <div className="h-64" role="img" aria-label="Grouped bar chart of precision, recall and F1 for the real and fake classes">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke={colors.line.DEFAULT} vertical={false} />
                  <XAxis dataKey="metric" stroke={colors.dim} tick={{ fontSize: 12, fill: colors.steel }} />
                  <YAxis domain={[0.9, 1]} stroke={colors.dim} tick={{ fontSize: 12, fill: colors.steel }} tickFormatter={(v) => v.toFixed(2)} />
                  <Tooltip formatter={(v) => v.toFixed(4)} contentStyle={{ background: colors.ink[3], border: `1px solid ${colors.line.strong}`, borderRadius: 8, fontSize: 12, color: colors.paper }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: colors.steel }} />
                  <Bar dataKey="Real" fill={colors.violet} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Fake" fill={colors.signal.DEFAULT} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section aria-labelledby="h-matrix" className="panel p-6 lg:col-span-5">
            <h2 id="h-matrix" className="t-h2 mb-4">
              Confusion matrix
            </h2>
            <ConfusionMatrix matrix={test.confusion_matrix} />
          </section>

          <section aria-labelledby="h-features" className="panel p-6 lg:col-span-7">
            <h2 id="h-features" className="t-h2">
              What the model leans on
            </h2>
            <p className="t-caption mb-4 mt-1">Highest-weight words and phrases. Many are publisher or formatting habits, not claims, which is why the score says little about truth.</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[0.8125rem] text-steel">Toward the “fake” label</p>
                <p className="t-data text-[0.8125rem] leading-relaxed">{variant.top_features.most_fake.slice(0, 12).join(' · ')}</p>
              </div>
              <div>
                <p className="mb-1.5 text-[0.8125rem] text-steel">Toward the “real” label</p>
                <p className="t-data text-[0.8125rem] leading-relaxed">{variant.top_features.most_real.slice(0, 12).join(' · ')}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section aria-labelledby="h-data" className="mt-16 border-t border-line pt-10">
        <h2 id="h-data" className="t-h2">
          The dataset
        </h2>
        <p className="t-body mt-3">
          {data.dataset_name} ({data.dataset_license}).{' '}
          <a href={data.dataset_source} target="_blank" rel="noopener noreferrer" className="text-signal underline decoration-signal/30 hover:decoration-signal">
            Source record
          </a>
          . {data.label_convention}.
        </p>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Raw rows', c.raw_rows],
            ['Removed: empty or very short', c.dropped_empty_content],
            ['Removed: duplicates', c.dropped_exact_duplicates + c.dropped_duplicate_text],
            ['Used', c.final_rows],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="t-caption">{k}</dt>
              <dd className="t-data text-2xl">{v.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
        <p className="t-caption mt-5 max-w-3xl">
          Split ({data.split_strategy}): {Object.entries(data.split_sizes).map(([name, s]) => `${name} ${s.rows.toLocaleString()}`).join(' · ')}. Leakage check: {data.leakage_check}.
        </p>
      </section>

      <section aria-labelledby="h-limits" className="mt-16 border-t border-line pt-10">
        <h2 id="h-limits" className="t-h2">
          Limitations
        </h2>
        <ul className="mt-6 grid gap-x-16 gap-y-7 md:grid-cols-2">
          {data.limitations.map((l) => (
            <li key={l.title}>
              <h3 className="t-h3">{l.title}</h3>
              <p className="t-body mt-1.5 text-[0.9375rem]">{l.detail}</p>
            </li>
          ))}
        </ul>
        <p className="t-caption mt-10">Metrics generated {new Date(data.generated_at).toLocaleString()} by the training script. Nothing on this page is entered by hand.</p>
      </section>
    </>,
  )
}
