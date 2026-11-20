import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import { describeError } from '../services/analysisService'
import { deleteAnalysis, listAnalyses } from '../services/historyService'

const PAGE_SIZE = 10
const LABELS = {
  resembles_unreliable_sources: 'Resembles unreliable-source style',
  resembles_reliable_sources: 'Resembles reliable-source style',
}
const LEVELS = { moderate: 'Moderate uncertainty', high: 'High uncertainty', very_high: 'Very high uncertainty' }

export default function HistoryPage() {
  const [page, setPage] = useState(null)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  async function handleDelete(id) {
    if (!window.confirm('Delete this saved analysis? This cannot be undone.')) return
    try {
      await deleteAnalysis(id)
      // Step back a page if the last item on it was removed.
      const remaining = page.items.length - 1
      if (remaining === 0 && offset > 0) setOffset(Math.max(0, offset - PAGE_SIZE))
      else load(offset)
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <>
      <PageHeader title="Analysis History" description="Analyses you ran while signed in. Only you can see them." />
      {error && (
        <div role="alert" className="mb-5 rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3.5 text-sm text-veritas-error">
          {error}
        </div>
      )}
      {loading && !page ? (
        <p className="text-sm text-veritas-muted">Loading…</p>
      ) : page && page.items.length === 0 ? (
        <Card className="max-w-xl">
          <p className="text-sm text-veritas-muted">
            Nothing saved yet. Run an analysis from <Link to="/analyze" className="text-veritas-cyan hover:underline">Analyze Content</Link> while signed in and it will appear here.
          </p>
        </Card>
      ) : (
        page && (
          <>
            <ul className="space-y-3">
              {page.items.map((item) => (
                <li key={item.id}>
                  <Card className="flex items-start gap-4">
                    <Link to={`/history/${item.id}`} className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge tone="accent">{LABELS[item.classifier_label]}</StatusBadge>
                        <StatusBadge tone={item.uncertainty_level === 'very_high' ? 'error' : 'warning'}>{LEVELS[item.uncertainty_level]}</StatusBadge>
                        <span className="text-xs text-veritas-dim">
                          {new Date(item.created_at).toLocaleString()} · {item.word_count} words
                        </span>
                      </div>
                      <h2 className="truncate text-sm font-medium text-veritas-text">{item.title || 'Untitled text'}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-veritas-muted">{item.preview}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      aria-label={`Delete analysis ${item.title || 'untitled'}`}
                      className="rounded-lg p-2 text-veritas-dim transition-colors hover:bg-veritas-error-light hover:text-veritas-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Card>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between text-xs text-veritas-muted">
              <span>
                Showing {offset + 1}–{offset + page.items.length} of {page.total}
              </span>
              <div className="flex gap-2">
                <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="rounded-lg border border-veritas-border-subtle px-3 py-1.5 hover:text-veritas-text disabled:opacity-40">
                  Newer
                </button>
                <button type="button" disabled={offset + PAGE_SIZE >= page.total} onClick={() => setOffset(offset + PAGE_SIZE)} className="rounded-lg border border-veritas-border-subtle px-3 py-1.5 hover:text-veritas-text disabled:opacity-40">
                  Older
                </button>
              </div>
            </div>
          </>
        )
      )}
    </>
  )
}
