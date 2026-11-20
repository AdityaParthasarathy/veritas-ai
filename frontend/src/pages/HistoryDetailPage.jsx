import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AnalysisResults from '../components/analysis/AnalysisResults'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import { describeError } from '../services/analysisService'
import { getAnalysis } from '../services/historyService'

export default function HistoryDetailPage() {
  const { id } = useParams()
  const [stored, setStored] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getAnalysis(id)
      .then((data) => !cancelled && setStored(data))
      .catch((err) => !cancelled && setError(describeError(err)))
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <>
      <Link to="/history" className="mb-4 inline-flex items-center gap-1.5 text-xs text-veritas-muted hover:text-veritas-text">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to history
      </Link>
      {error && (
        <div role="alert" className="rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3.5 text-sm text-veritas-error">
          {error}
        </div>
      )}
      {!stored && !error && <p className="text-sm text-veritas-muted">Loading…</p>}
      {stored && (
        <>
          <PageHeader title={stored.title || 'Untitled text'} description={`Analyzed ${new Date(stored.created_at).toLocaleString()}`} />
          <Card>
            <h2 className="mb-2 text-xs font-medium text-veritas-muted">Submitted text</h2>
            <p className="max-h-60 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-veritas-muted">{stored.text}</p>
          </Card>
          <p className="mt-3 text-xs text-veritas-dim">Results below are the stored output from when the analysis was run; they are not recomputed.</p>
          <AnalysisResults result={stored.result} />
        </>
      )}
    </>
  )
}
