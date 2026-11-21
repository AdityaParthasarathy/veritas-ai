import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Play, Search } from 'lucide-react'
import { LEVEL_TEXT, percent } from '../components/report/reportModel'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Reveal from '../components/ui/Reveal'
import Tabs from '../components/ui/Tabs'
import { CASES, RECORDED_ON } from '../data/cases'

/** The recorded output of a case as three separate readings (never one score). */
export function RecordedReadings({ recorded }) {
  const related = recorded.evidence.hits.filter((h) => h.relevant).length
  const outOfDomain = recorded.uncertainty.domain_check?.available && !recorded.uncertainty.domain_check.in_domain
  return (
    <dl className="grid gap-2 text-[0.8125rem] sm:grid-cols-3">
      <div className="rounded-md border border-line bg-ink-1/70 px-3 py-2">
        <dt className="t-meta">Writing style</dt>
        <dd className="mt-0.5 text-paper">{outOfDomain ? 'Not meaningful' : recorded.classification.label === 'resembles_unreliable_sources' ? 'Unreliable-like' : 'Reliable-like'}</dd>
        <dd className="t-meta">{percent(recorded.classification.probability_unreliable_style)} unreliable label</dd>
      </div>
      <div className="rounded-md border border-line bg-ink-1/70 px-3 py-2">
        <dt className="t-meta">Related passages</dt>
        <dd className="mt-0.5 text-paper">{related === 0 ? 'None found' : `${related} found`}</dd>
        <dd className="t-meta">of {recorded.evidence.collection_size}</dd>
      </div>
      <div className="rounded-md border border-line bg-ink-1/70 px-3 py-2">
        <dt className="t-meta">Trust</dt>
        <dd className="mt-0.5 text-paper">{LEVEL_TEXT[recorded.uncertainty.level]?.name}</dd>
        <dd className="t-meta">analysis caution</dd>
      </div>
    </dl>
  )
}

function CaseCard({ item, featured, onRun }) {
  return (
    <article className={`panel panel-hover relative flex flex-col gap-4 p-5 sm:p-6 ${featured ? 'md:col-span-2' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{item.kind}</Badge>
        <Badge>Invented example</Badge>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={`font-semibold leading-snug tracking-[-0.025em] text-paper ${featured ? 'text-[1.75rem]' : 'text-[1.25rem]'}`}>
          <Link to={`/casebook/${item.id}`} className="decoration-violet/60 underline-offset-4 after:absolute after:inset-0 hover:underline">
            {item.title}
          </Link>
        </h2>
        <p className="t-body mt-2 text-[0.9375rem]">{item.note}</p>
        <p className={`t-caption mt-3 ${featured ? 'max-w-2xl' : 'line-clamp-3'}`}>
          <span className="font-medium text-steel">Why it is here: </span>
          {item.why}
        </p>
      </div>
      {item.recorded && <RecordedReadings recorded={item.recorded} />}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="t-meta">Recorded {RECORDED_ON}</p>
        <Button variant="secondary" size="sm" onClick={() => onRun(item)}>
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Run this case
        </Button>
      </div>
    </article>
  )
}

export default function CasebookPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const kinds = useMemo(() => [{ id: 'all', label: 'All', count: CASES.length }, ...[...new Set(CASES.map((c) => c.kind))].map((k) => ({ id: k, label: k, count: CASES.filter((c) => c.kind === k).length }))], [])
  const visible = CASES.filter((c) => (kind === 'all' || c.kind === kind) && `${c.title} ${c.note} ${c.why} ${c.kind}`.toLowerCase().includes(query.trim().toLowerCase()))
  const run = (item) => navigate('/analyze', { state: { draft: { mode: 'text', title: '', text: item.text, url: '' } } })

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">
      <div className="mb-8 max-w-3xl">
        <p className="t-eyebrow mb-3">Casebook</p>
        <h1 className="t-h1">Six invented investigations, with recorded readings</h1>
        <p className="t-lead mt-4">Each case is a text written for this project, chosen to show a situation the instrument has to handle honestly. The readings were recorded from the live system. Run any case to reproduce it.</p>
      </div>

      <div role="note" className="mb-8 flex max-w-3xl gap-3 rounded-lg border border-caution/30 bg-caution/10 px-4 py-3 text-[0.875rem] text-steel">
        <span className="font-mono text-caution" aria-hidden="true">!</span>
        <p>These are not real news articles. The people, organisations and figures in them are invented, and the false claims are deliberately false.</p>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <Tabs tabs={kinds} value={kind} onChange={setKind} label="Filter cases by category" idPrefix="case-kind" className="min-w-0 flex-1" />
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search cases" placeholder="Search cases" className="h-10 w-full rounded-full border border-line bg-ink-1/80 pl-9 pr-3 text-sm text-paper outline-none transition-colors duration-fast hover:border-line-strong focus:border-violet" />
        </div>
      </div>
      <div id="case-kind-panel" role="tabpanel" aria-labelledby={`case-kind-tab-${kind}`} className="pt-5">
        {visible.length === 0 ? (
          <div className="panel border-dashed p-8 text-center">
            <p className="text-sm font-semibold text-paper">No case matches</p>
            <p className="t-caption mt-1">Try another category or clear the search.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((item, i) => (
              <Reveal key={item.id} delay={i * 40} className={i === 0 && kind === 'all' && !query ? 'md:col-span-2' : ''}>
                <CaseCard item={item} featured={i === 0 && kind === 'all' && !query} onRun={run} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <p className="t-caption mt-8 flex items-center gap-2">
        Want to try your own text instead?
        <Link to="/analyze" className="inline-flex items-center gap-1 text-signal underline decoration-signal/30 hover:decoration-signal">
          Open an investigation <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </p>
    </div>
  )
}
