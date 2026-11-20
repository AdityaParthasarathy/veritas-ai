import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ScanSearch } from 'lucide-react'
import AnalysisResults from '../components/analysis/AnalysisResults'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'
import { analyzeText, analyzeUrl, describeError } from '../services/analysisService'

const MAX_CHARS = 20000
const MIN_CHARS = 20
const INPUT =
  'w-full rounded-lg border border-veritas-border-subtle bg-veritas-bg/60 px-3 py-2 text-sm text-veritas-text outline-none transition-colors placeholder:text-veritas-dim focus:border-veritas-primary'

const MODES = [
  { id: 'text', label: 'Paste text' },
  { id: 'url', label: 'Article URL' },
]

export default function AnalyzePage() {
  const { user } = useAuth()
  const [mode, setMode] = useState('text')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const resultsRef = useRef(null)

  const invalid = mode === 'text' ? text.trim().length < MIN_CHARS : !/^https?:\/\/\S+$/i.test(url.trim())

  // Move focus to the results so keyboard and screen-reader users land on them.
  useEffect(() => {
    if (result) resultsRef.current?.focus()
  }, [result])

  async function handleSubmit(event) {
    event.preventDefault()
    if (invalid || loading) return
    setLoading(true)
    setError(null)
    try {
      setResult(mode === 'text' ? await analyzeText({ title: title.trim() || null, text }) : await analyzeUrl(url.trim()))
    } catch (err) {
      setResult(null)
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }

  function onTabKeyDown(event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const next = mode === 'text' ? 'url' : 'text'
    setMode(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <>
      <PageHeader
        title="Analyze Content"
        description="Paste a headline or article, or give a public article URL. You get a machine-learning classification, linguistic measurements and related reference passages, shown separately, with an uncertainty assessment. Nothing here verifies whether claims are true."
      />

      <Card>
        <div role="tablist" aria-label="Input type" className="mb-4 inline-flex rounded-lg bg-white/5 p-1" onKeyDown={onTabKeyDown}>
          {MODES.map((m) => (
            <button
              key={m.id}
              id={`tab-${m.id}`}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              aria-controls="analyze-panel"
              tabIndex={mode === m.id ? 0 : -1}
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === m.id ? 'bg-veritas-card text-veritas-text' : 'text-veritas-muted hover:text-veritas-text'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div id="analyze-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'text' ? (
            <>
              <div>
                <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-veritas-muted">
                  Headline <span className="text-veritas-dim">(optional)</span>
                </label>
                <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} className={INPUT} placeholder="Article headline" />
              </div>
              <div>
                <label htmlFor="text" className="mb-1.5 block text-xs font-medium text-veritas-muted">
                  Article text
                </label>
                <textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={MAX_CHARS}
                  rows={9}
                  aria-describedby="text-hint"
                  className={`${INPUT} resize-y leading-relaxed`}
                  placeholder="Paste the article body here. Longer, full articles give more meaningful results than a single headline."
                />
                <div id="text-hint" className="mt-1.5 flex justify-between text-xs text-veritas-dim">
                  <span>At least {MIN_CHARS} characters.</span>
                  <span>
                    {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="url" className="mb-1.5 block text-xs font-medium text-veritas-muted">
                Article URL
              </label>
              <input
                id="url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={2048}
                aria-describedby="url-hint"
                className={INPUT}
                placeholder="https://example.com/news/article"
              />
              <p id="url-hint" className="mt-1.5 text-xs leading-relaxed text-veritas-dim">
                The server fetches the page and extracts the article text. Only public http(s) pages are allowed: local, private and non-web addresses are blocked. Paywalled or script-rendered pages may not work.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={invalid || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-veritas-primary-solid px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-veritas-primary-solid-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />}
            {loading ? (mode === 'url' ? 'Fetching and analyzing…' : 'Analyzing…') : 'Analyze'}
          </button>
          <p className="text-xs text-veritas-dim">{user ? 'Signed in: this analysis will be saved to your history.' : 'Not signed in: this analysis will not be saved.'}</p>
        </form>
        </div>
      </Card>

      <div aria-live="polite" className="sr-only">
        {loading ? 'Analysis in progress.' : result ? 'Analysis complete. Results are shown below.' : ''}
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3.5 text-sm text-veritas-error">
          {error}
        </div>
      )}

      {result && (
        <div ref={resultsRef} tabIndex={-1} className="outline-none">
          <p className="mt-5 text-xs text-veritas-muted">
            {result.analysis_id ? (
              <>
                Saved to your{' '}
                <Link to={`/history/${result.analysis_id}`} className="text-veritas-cyan hover:underline">
                  history
                </Link>
                .
              </>
            ) : (
              <>
                Not saved.{' '}
                <Link to="/login" state={{ from: '/analyze' }} className="text-veritas-cyan hover:underline">
                  Sign in
                </Link>{' '}
                to keep your analyses.
              </>
            )}
          </p>
          <AnalysisResults result={result} />
        </div>
      )}
    </>
  )
}
