import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, Cpu, FolderClock, ShieldHalf, Sigma } from 'lucide-react'
import { deriveTitle, LEVEL_TEXT, percent } from '../components/report/reportModel'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { describeError } from '../services/analysisService'
import { listAnalyses } from '../services/historyService'
import { getPerformance } from '../services/performanceService'

const WINDOW = 50 // how many of the newest saved investigations the dashboard summarises
const DAYS = 14

function Stat({ icon: Icon, label, value, detail, tone }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="t-meta">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${tone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-[1.75rem] font-semibold leading-none tracking-tight text-paper">{value}</p>
      <p className="t-caption mt-2">{detail}</p>
    </div>
  )
}

/** Analyses per day for the last DAYS days, drawn from the saved investigations that were loaded. */
function ActivityChart({ items, now }) {
  const days = useMemo(() => {
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const buckets = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (DAYS - 1 - i))
      return { key: d.toDateString(), date: d, count: 0 }
    })
    for (const item of items) {
      const bucket = buckets.find((b) => b.key === new Date(item.created_at).toDateString())
      if (bucket) bucket.count += 1
    }
    return buckets
  }, [items, now])
  const max = Math.max(1, ...days.map((d) => d.count))
  const total = days.reduce((sum, d) => sum + d.count, 0)
  return (
    <figure>
      <div role="img" aria-label={`Analyses per day over the last ${DAYS} days: ${total} in total`} className="flex h-32 items-end gap-1.5">
        {days.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 items-end" title={`${d.date.toLocaleDateString()}: ${d.count}`}>
            <span className={`block w-full rounded-t-sm transition-[height,background-color] duration-slow ease-out ${d.count ? 'bg-signal-gradient' : 'bg-line'}`} style={{ height: d.count ? `${Math.max(8, (d.count / max) * 100)}%` : '3px' }} />
          </div>
        ))}
      </div>
      <div className="t-meta mt-2 flex justify-between">
        <span>{days[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>today</span>
      </div>
      <figcaption className="t-caption mt-2">{total} saved in the last {DAYS} days.</figcaption>
    </figure>
  )
}

function Split({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  return (
    <div>
      <div role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')} className="flex h-2.5 overflow-hidden rounded-full bg-line">
        {parts.map((p) => (
          <span key={p.label} className={p.className} style={{ width: total ? `${(p.value / total) * 100}%` : 0 }} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between text-[0.8125rem]">
            <span className="flex items-center gap-2 text-steel">
              <span className={`h-2 w-2 rounded-full ${p.className}`} aria-hidden="true" />
              {p.label}
            </span>
            <span className="t-data">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { readout } = useOutletContext() ?? {}
  const [page, setPage] = useState(null)
  const [perf, setPerf] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    listAnalyses(WINDOW, 0)
      .then((data) => !cancelled && setPage(data))
      .catch((err) => !cancelled && setError(describeError(err)))
      .finally(() => !cancelled && setLoading(false))
    getPerformance()
      .then((data) => !cancelled && setPerf(data))
      .catch(() => {}) // the model snapshot is optional; the Method page reports its own errors
    return () => {
      cancelled = true
    }
  }, [])

  const items = page?.items ?? []
  const unreliable = items.filter((i) => i.classifier_label === 'resembles_unreliable_sources').length
  const reliable = items.length - unreliable
  const levels = { moderate: 0, high: 0, very_high: 0, ...items.reduce((acc, i) => ({ ...acc, [i.uncertainty_level]: (acc[i.uncertainty_level] ?? 0) + 1 }), {}) }
  const name = (user?.full_name || user?.email || '').split(/[\s@]/)[0]
  const variant = perf?.variants?.find((v) => v.variant === 'source_masked') ?? perf?.variants?.[0]
  const windowNote = page && page.total > items.length ? `latest ${items.length} of ${page.total}` : `all ${items.length}`

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="t-eyebrow mb-2">Dashboard</p>
          <h1 className="t-h1">Welcome back{name ? `, ${name}` : ''}</h1>
          <p className="t-lead mt-3">Your saved investigations and the state of the system. Only you can see them.</p>
        </div>
        <Button to="/analyze" size="lg">
          New investigation
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
          {error}
        </div>
      )}

      {loading ? (
        <div role="status" aria-label="Loading your dashboard" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : page && page.total === 0 ? (
        <EmptyState
          title="No investigations yet"
          action={
            <Button to="/analyze" variant="secondary">
              Open your first investigation
            </Button>
          }
        >
          Run an analysis while signed in and it will be saved here with its full report. Your activity summary appears once you have saved one.
        </EmptyState>
      ) : (
        page && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={FolderClock} tone="bg-brand/25 text-violet" label="Saved investigations" value={page.total.toLocaleString()} detail="In your private Casebook" />
              <Stat icon={Sigma} tone="bg-signal/15 text-signal" label="Style readings" value={`${reliable} / ${unreliable}`} detail={`reliable-like / unreliable-like (${windowNote})`} />
              <Stat icon={ShieldHalf} tone="bg-caution/15 text-caution" label="High or very high caution" value={levels.high + levels.very_high} detail={`of ${items.length} recent investigations`} />
              <Stat
                icon={Cpu}
                tone="bg-support/15 text-support"
                label="Models"
                value={readout?.models === 'ready' ? 'Ready' : (readout?.models ?? 'unknown').replace('_', ' ')}
                detail={readout?.loadSeconds != null ? `Loaded in ${readout.loadSeconds}s · API ${readout.api}` : `API ${readout?.api ?? 'unknown'}`}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-12">
              <section aria-labelledby="recent-title" className="panel p-6 lg:col-span-7">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 id="recent-title" className="t-h2">
                    Recent investigations
                  </h2>
                  <Link to="/history" className="text-[0.8125rem] text-signal underline decoration-signal/30 hover:decoration-signal">
                    Open Casebook
                  </Link>
                </div>
                <ul className="divide-y divide-line">
                  {items.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <Link to={`/history/${item.id}`} className="press group -mx-2 flex items-center gap-4 rounded-md px-2 py-3 hover:bg-ink-3/60">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.9375rem] font-medium text-paper">{item.title || deriveTitle(item.preview)}</p>
                          <p className="t-meta mt-0.5">
                            {new Date(item.created_at).toLocaleDateString()} · {item.word_count} words
                          </p>
                        </div>
                        <Badge tone={item.uncertainty_level === 'very_high' ? 'neutral' : item.classifier_label === 'resembles_unreliable_sources' ? 'contra' : 'support'}>{item.classifier_label === 'resembles_unreliable_sources' ? 'unreliable-like' : 'reliable-like'}</Badge>
                        <Badge tone={item.uncertainty_level === 'very_high' ? 'contra' : 'caution'}>{LEVEL_TEXT[item.uncertainty_level]?.short ?? item.uncertainty_level} caution</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="activity-title" className="panel p-6 lg:col-span-5">
                <h2 id="activity-title" className="t-h2 mb-1">
                  Activity
                </h2>
                <p className="t-caption mb-5">Investigations saved per day, from your {windowNote} saved.</p>
                <ActivityChart items={items} now={now} />
              </section>

              <section aria-labelledby="mix-title" className="panel p-6 lg:col-span-6">
                <h2 id="mix-title" className="t-h2 mb-1">
                  Reading mix
                </h2>
                <p className="t-caption mb-5">Descriptive counts of your {windowNote} saved investigations. Style labels are not verdicts.</p>
                <div className="grid gap-8 sm:grid-cols-2">
                  <Split
                    parts={[
                      { label: 'Reliable-like style', value: reliable, className: 'bg-signal' },
                      { label: 'Unreliable-like style', value: unreliable, className: 'bg-violet' },
                    ]}
                  />
                  <Split
                    parts={[
                      { label: 'Moderate caution', value: levels.moderate, className: 'bg-caution/60' },
                      { label: 'High caution', value: levels.high, className: 'bg-caution' },
                      { label: 'Very high caution', value: levels.very_high, className: 'bg-contra' },
                    ]}
                  />
                </div>
              </section>

              <section aria-labelledby="model-title" className="panel p-6 lg:col-span-6">
                <h2 id="model-title" className="t-h2 mb-1">
                  Model snapshot
                </h2>
                {variant ? (
                  <>
                    <p className="t-caption mb-4">Measured on a held-out test split of the training dataset ({variant.variant.replace('_', '-')} variant).</p>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="t-meta">Agreement with dataset labels</dt>
                        <dd className="t-data text-2xl">{percent(variant.test.accuracy)}</dd>
                      </div>
                      <div>
                        <dt className="t-meta">Macro F1</dt>
                        <dd className="t-data text-2xl">{percent(variant.test.macro_avg.f1)}</dd>
                      </div>
                    </dl>
                    <p className="t-caption mt-4">This is agreement with labels, not factual accuracy. {' '}
                      <Link to="/performance" className="text-signal underline decoration-signal/30 hover:decoration-signal">
                        See the full method and its limits
                      </Link>
                      .
                    </p>
                  </>
                ) : (
                  <p className="t-body mt-3">Model metrics are not available right now. The Method page reports them when the backend can serve them.</p>
                )}
              </section>
            </div>
          </>
        )
      )}
    </div>
  )
}
