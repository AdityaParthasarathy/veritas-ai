import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import EvidencePassage from '../components/analysis/EvidencePassage'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import { describeError, listPassages, searchPassages } from '../services/analysisService'

export default function EvidenceExplorerPage() {
  const [collection, setCollection] = useState(null)
  const [passages, setPassages] = useState([])
  const [topic, setTopic] = useState('All')
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    setError(null)
    try {
      setSearchResult(await searchPassages(query.trim(), 5))
    } catch (err) {
      setError(describeError(err))
    }
  }

  const topics = ['All', ...new Set(passages.map((p) => p.topic))]
  const visible = topic === 'All' ? passages : passages.filter((p) => p.topic === topic)

  return (
    <>
      <PageHeader
        title="Evidence Explorer"
        description="Browse and search the curated reference collection used for evidence retrieval. Search is semantic: it matches meaning, not just keywords."
      />

      {collection && (
        <p className="mb-5 max-w-3xl text-xs leading-relaxed text-veritas-dim">
          <span className="font-medium text-veritas-muted">{collection.name}</span> · {collection.size} passages · source links checked {collection.url_checked_on}. {collection.description}
        </p>
      )}

      <Card className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the reference collection"
            placeholder="e.g. why do we have seasons?"
            className="min-w-0 flex-1 rounded-lg border border-veritas-border-subtle bg-veritas-bg/60 px-3 py-2 text-sm text-veritas-text outline-none placeholder:text-veritas-dim focus:border-veritas-primary"
          />
          <button
            type="submit"
            disabled={query.trim().length < 3}
            className="inline-flex items-center gap-2 rounded-lg bg-veritas-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-veritas-primary-hover disabled:opacity-40"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </form>
        {searchResult && (
          <div className="mt-5">
            <h2 className="mb-3 text-xs font-medium text-veritas-muted">Top matches for “{searchResult.query}”</h2>
            <ul className="space-y-3">
              {searchResult.hits.map((hit) => (
                <EvidencePassage key={hit.id} hit={hit} />
              ))}
            </ul>
          </div>
        )}
      </Card>

      {error && (
        <div role="alert" className="mb-5 rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3.5 text-sm text-veritas-error">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-veritas-muted">Loading collection…</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {topics.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTopic(name)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  topic === name ? 'bg-veritas-primary-light text-veritas-text' : 'bg-white/5 text-veritas-muted hover:text-veritas-text'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {visible.map((hit) => (
              <EvidencePassage key={hit.id} hit={hit} showScore={false} />
            ))}
          </ul>
        </>
      )}
    </>
  )
}
