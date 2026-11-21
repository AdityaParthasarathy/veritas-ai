import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Search, Trash2 } from 'lucide-react'
import { deriveTitle, LEVEL_TEXT, percent } from '../components/report/reportModel'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/ui/Skeleton'
import Tabs from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { describeError } from '../services/analysisService'
import { deleteAnalysis, listAnalyses } from '../services/historyService'

const PAGE_SIZE = 10
const LEVEL_STEPS = ['moderate', 'high', 'very_high']
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unreliable', label: 'Resembles unreliable' },
  { id: 'reliable', label: 'Resembles reliable' },
  { id: 'caution', label: 'High caution' },
]

function MiniScale({ probability, label }) {
  return (
    <span className="flex flex-col items-end gap-1">
      <span role="img" aria-label={`${percent(probability)} for the unreliable-source label`} className="relative block h-3 w-24">
        <span className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
        <span className="absolute left-1/2 top-0 h-3 w-px bg-dim" />
        <span className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-signal-gradient" style={{ left: `${probability * 100}%` }} />
      </span>
      <span className="t-meta">{label}</span>
    </span>
  )
}

function Pips({ level }) {
  const index = LEVEL_STEPS.indexOf(level)
  return (
    <span className="flex flex-col items-end gap-1">
      <span role="img" aria-label={LEVEL_TEXT[level]?.name} className="flex h-4 items-end gap-0.5">
        {LEVEL_STEPS.map((step, i) => (
          <span key={step} className={`w-1.5 rounded-[1px] ${i <= index ? (level === 'very_high' ? 'bg-contra' : 'bg-caution') : 'bg-line-strong'}`} style={{ height: `${40 + i * 30}%` }} />
        ))}
      </span>
      <span className="t-meta">{LEVEL_TEXT[level]?.short} caution</span>
    </span>
  )
}

function Card({ item, onDelete, featured }) {
  const when = new Date(item.created_at)
  const unreliable = item.classifier_label === 'resembles_unreliable_sources'
  return (
    <li className={`panel panel-hover group relative flex flex-col gap-4 p-5 sm:p-6 ${featured ? 'sm:col-span-2' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={item.uncertainty_level === 'very_high' ? 'neutral' : unreliable ? 'contra' : 'support'}>{unreliable ? 'Unreliable-like style' : 'Reliable-like style'}</Badge>
        <time dateTime={item.created_at} className="t-meta ml-auto">
          {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={`font-display font-semibold leading-snug tracking-[-0.02em] text-paper ${featured ? 'text-[1.625rem]' : 'text-[1.125rem]'}`}>
          <Link to={`/history/${item.id}`} className="decoration-violet/60 underline-offset-4 after:absolute after:inset-0 hover:underline">
            {item.title || deriveTitle(item.preview)}
          </Link>
        </h2>
        <p className={`t-caption mt-2 ${featured ? 'line-clamp-3 max-w-2xl' : 'line-clamp-2'}`}>{item.preview}</p>
      </div>
      <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
        <div className="flex items-start gap-5">
          <MiniScale probability={item.probability_unreliable} label={`${item.word_count} words`} />
          <Pips level={item.uncertainty_level} />
        </div>
        <button type="button" onClick={() => onDelete(item)} aria-label={`Delete investigation ${item.title || 'untitled'}`} className="press relative z-10 rounded-md p-2 text-dim hover:bg-contra/10 hover:text-contra">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

export default function HistoryPage() {
  const toast = useToast()
  const [page, setPage] = useState(null)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const location = useLocation()
  const searchRef = useRef(null)
  const [pending, setPending] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const cancelRef = useRef(null)

  const load = useCallback(async (nextOffset) => {
    setLoading(true)
    setError(null)
    try {
      setPage(await listAnalyses(PAGE_SIZE, nextOffset))
    } catch (err) {
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(offset)
  }, [load, offset])

  useEffect(() => {
    if (location.state?.focusSearch && page) searchRef.current?.focus()
  }, [location.state, page])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = (page?.items ?? []).filter((item) => {
      if (filter === 'unreliable' && item.classifier_label !== 'resembles_unreliable_sources') return false
      if (filter === 'reliable' && item.classifier_label !== 'resembles_reliable_sources') return false
      if (filter === 'caution' && item.uncertainty_level === 'moderate') return false
      return !q || `${item.title ?? ''} ${item.preview}`.toLowerCase().includes(q)
    })
    return sort === 'oldest' ? [...rows].reverse() : sort === 'caution' ? [...rows].sort((a, b) => LEVEL_STEPS.indexOf(b.uncertainty_level) - LEVEL_STEPS.indexOf(a.uncertainty_level)) : rows
  }, [page, query, filter, sort])

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteAnalysis(pending.id)
      toast({ title: 'Investigation deleted' })
      const remaining = page.items.length - 1
      setPending(null)
      if (remaining === 0 && offset > 0) setOffset(Math.max(0, offset - PAGE_SIZE))
      else load(offset)
    } catch (err) {
      toast({ title: 'Could not delete', description: describeError(err), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const cautionCount = (page?.items ?? []).filter((i) => i.uncertainty_level !== 'moderate').length

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="t-eyebrow mb-2">Your workspace</p>
          <h1 className="t-h1">Saved investigations</h1>
          <p className="t-lead mt-4">
            {page && page.total > 0
              ? `${page.total} saved investigation${page.total === 1 ? '' : 's'}${cautionCount > 0 ? `, ${cautionCount} on this page with high or very high caution` : ''}. Only you can see them.`
              : 'Investigations you run while signed in are kept here, private to you.'}
          </p>
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

      {loading && !page ? (
        <div role="status" aria-label="Loading your saved investigations" className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : page && page.total === 0 ? (
        <EmptyState
          title="No investigations yet"
          action={
            <Button to="/analyze" variant="secondary">
              Open your first investigation
            </Button>
          }
          art={
            <svg viewBox="0 0 120 80" className="h-24 w-36" fill="none" strokeLinecap="round" aria-hidden="true">
              <path d="M8 22 Q18 10 28 22 T48 22" stroke="#8691A0" strokeWidth="1.4" />
              <path d="M8 36 Q20 26 30 38 T52 34" stroke="#8691A0" strokeWidth="1.4" />
              <path d="M8 50 H60" stroke="#3A424D" strokeWidth="1.4" />
              <path d="M8 64 H48" stroke="#3A424D" strokeWidth="1.4" />
              <rect x="70" y="12" width="40" height="56" rx="3" stroke="#3A424D" strokeWidth="1.4" />
              <path d="M78 26 H102 M78 36 H98 M78 46 H92" stroke="#57D8E6" strokeWidth="1.6" />
            </svg>
          }
        >
          Run an analysis while signed in and it will be saved here with its full report, so you can return to it later.
        </EmptyState>
      ) : (
        page && (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
              <Tabs tabs={FILTERS} value={filter} onChange={setFilter} label="Filter investigations" idPrefix="filter" className="min-w-0 flex-1" />
              <div className="flex w-full items-center gap-2 sm:w-auto">
              <label htmlFor="sort" className="sr-only">
                Sort investigations
              </label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-full border border-line bg-ink-1/80 px-3 text-sm text-steel outline-none hover:border-line-strong focus:border-violet">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="caution">Highest caution first</option>
              </select>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden="true" />
                <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search this page of investigations" placeholder="Search this page" className="h-10 w-full rounded-full border border-line bg-ink-1/80 pl-9 pr-3 text-sm text-paper outline-none transition-colors duration-fast hover:border-line-strong focus:border-signal" />
              </div>
            </div>
            </div>
            <div id="filter-panel" role="tabpanel" aria-labelledby={`filter-tab-${filter}`} className="pt-5">
              {items.length === 0 ? (
                <p className="t-body py-10">Nothing on this page matches. Try another filter or search term.</p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item, i) => (
                    <Card key={item.id} item={item} onDelete={setPending} featured={i === 0 && offset === 0 && filter === 'all' && !query} />
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-[0.8125rem] text-dim">
              <span className="t-meta">
                {offset + 1} to {offset + page.items.length} of {page.total}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                  Newer
                </Button>
                <Button variant="secondary" size="sm" disabled={offset + PAGE_SIZE >= page.total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                  Older
                </Button>
              </div>
            </div>
          </>
        )
      )}

      <Modal
        open={Boolean(pending)}
        onClose={() => !deleting && setPending(null)}
        title="Delete this investigation?"
        description="It will be removed from your saved investigations permanently."
        initialFocusRef={cancelRef}
        footer={
          <>
            <Button ref={cancelRef} variant="ghost" onClick={() => setPending(null)} disabled={deleting}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="t-body">“{pending?.title || (pending ? deriveTitle(pending.preview) : '')}”</p>
      </Modal>
    </div>
  )
}
