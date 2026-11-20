import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import EvidenceItem from '../components/report/EvidenceItem'
import Kbd from '../components/ui/Kbd'
import Skeleton from '../components/ui/Skeleton'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import { useHotkey } from '../hooks/useHotkey'
import { describeError, listPassages, searchPassages } from '../services/analysisService'

export default function EvidenceExplorerPage() {
  const [collection, setCollection] = useState(null)
  const [passages, setPassages] = useState([])
  const [topic, setTopic] = useState('All')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useHotkey('/', () => inputRef.current?.focus())

  useEffect(() => {
    let cancelled = false
    listPassages()
      .then((data) => {
        if (cancelled) return
        setCollection(data.collection)
        setPassages(data.passages)
      })
      .catch((err) => !cancelled && setError(describeError(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSearch(event) {
    event.preventDefault()
    if (query.trim().length < 3) return
    setSearching(true)
    setError(null)
    try {
      setResults(await searchPassages(query.trim(), 5))
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSearching(false)
    }
  }

  const topics = useMemo(() => {
    const counts = passages.reduce((acc, p) => ({ ...acc, [p.topic]: (acc[p.topic] ?? 0) + 1 }), {})
    return [{ id: 'All', label: 'All', count: passages.length }, ...Object.entries(counts).map(([id, count]) => ({ id, label: id, count }))]
  }, [passages])
  const visible = topic === 'All' ? passages : passages.filter((p) => p.topic === topic)

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">
      <div className="mb-10 max-w-3xl">
        <h1 className="t-h1">Reference library</h1>
        <p className="t-lead mt-4">The passages Veritas retrieves from. Each is a short paraphrase of an institutional source, written for this project; the link is the authority. Search matches meaning, not just words.</p>
        {collection && (
          <p className="t-meta mt-4">
            {collection.name} · {collection.size} passages · source links checked {collection.url_checked_on}
          </p>
        )}
      </div>

      <form onSubmit={handleSearch} role="search" className="max-w-2xl">
        <label htmlFor="library-search" className="sr-only">
          Search the reference library by meaning
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden="true" />
          <input
            id="library-search"
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!e.target.value) setResults(null)
            }}
            placeholder="Try: why do we have seasons?"
            className="h-12 w-full rounded-md border border-line bg-ink-1 pl-11 pr-24 text-[0.9375rem] text-paper outline-none transition-colors duration-fast hover:border-line-strong focus:border-signal"
          />
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <Kbd>/</Kbd>
            <Button type="submit" size="sm" disabled={query.trim().length < 3} loading={searching}>
              Search
            </Button>
          </span>
        </div>
      </form>

      {error && (
        <div role="alert" className="mt-6 rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
          {error}
        </div>
      )}

      {results && (
        <section aria-label="Search results" className="mt-10">
          <h2 className="t-h2 mb-1">Closest passages to “{results.query}”</h2>
          <p className="t-caption mb-2">Ranked by similarity. The tick marks the cut-off Veritas uses to call a passage related.</p>
          <ol>
            {results.hits.map((hit) => (
              <EvidenceItem key={hit.id} hit={hit} threshold={results.relevance_threshold} muted={!hit.relevant} />
            ))}
          </ol>
        </section>
      )}

      <section aria-label="All passages" className="mt-14">
        {loading ? (
          <div role="status" aria-label="Loading the library" className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <>
            <Tabs tabs={topics} value={topic} onChange={setTopic} label="Filter by topic" idPrefix="topic" />
            <div id="topic-panel" role="tabpanel" aria-labelledby={`topic-tab-${topic}`}>
            <ol>
              {visible.map((p) => (
                <li key={p.id} className="grid gap-x-8 gap-y-2 border-b border-line py-5 sm:grid-cols-[13rem_1fr]">
                  <div>
                    <p className="t-meta">{p.id}</p>
                    <p className="t-caption mt-1">{p.topic}</p>
                  </div>
                  <div>
                    <p className="max-w-3xl text-[0.9375rem] leading-relaxed text-paper">{p.passage}</p>
                    <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[0.8125rem] text-signal underline decoration-signal/30 hover:decoration-signal">
                      {p.source_org}: {p.source_title}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </div>
                </li>
              ))}
            </ol>
            </div>
            {collection && <p className="t-caption mt-6 max-w-3xl">{collection.description}</p>}
          </>
        )}
      </section>
    </div>
  )
}
