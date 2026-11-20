import { useState } from 'react'
import { Loader2, ScanSearch } from 'lucide-react'
import AnalysisResults from '../components/analysis/AnalysisResults'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import { analyzeText, describeError } from '../services/analysisService'

const MAX_CHARS = 20000
const MIN_CHARS = 20

export default function AnalyzePage() {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const tooShort = text.trim().length < MIN_CHARS

  async function handleSubmit(event) {
    event.preventDefault()
    if (tooShort || loading) return
    setLoading(true)
    setError(null)
    try {
      setResult(await analyzeText({ title: title.trim() || null, text }))
    } catch (err) {
      setResult(null)
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Analyze Content"
        description="Paste a headline or article. You get a machine-learning classification, linguistic measurements and related reference passages, shown separately, with an uncertainty assessment. Nothing here verifies whether claims are true."
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-veritas-muted">
              Headline <span className="text-veritas-dim">(optional)</span>
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-veritas-border-subtle bg-veritas-bg/60 px-3 py-2 text-sm text-veritas-text outline-none transition-colors placeholder:text-veritas-dim focus:border-veritas-primary"
              placeholder="Article headline"
            />
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
              className="w-full resize-y rounded-lg border border-veritas-border-subtle bg-veritas-bg/60 px-3 py-2 text-sm leading-relaxed text-veritas-text outline-none transition-colors placeholder:text-veritas-dim focus:border-veritas-primary"
              placeholder="Paste the article body here. Longer, full articles give more meaningful results than a single headline."
            />
            <div className="mt-1.5 flex justify-between text-xs text-veritas-dim">
              <span>URL analysis is not supported yet. Paste the text.</span>
              <span>
                {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={tooShort || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-veritas-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-veritas-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </form>
      </Card>

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3.5 text-sm text-veritas-error">
          {error}
        </div>
      )}
      {result && <AnalysisResults result={result} />}
    </>
  )
}
