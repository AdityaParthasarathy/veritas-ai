import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Report from '../components/report/Report'
import Skeleton from '../components/ui/Skeleton'
import { describeError } from '../services/analysisService'
import { getAnalysis } from '../services/historyService'

export default function HistoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
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
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">
      <Link to="/history" className="mb-8 inline-flex items-center gap-1.5 text-[0.8125rem] text-dim transition-colors duration-fast hover:text-paper">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to saved investigations
      </Link>
      {error && (
        <div role="alert" className="rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
          {error}
        </div>
      )}
      {!stored && !error && (
        <div role="status" aria-label="Loading the saved investigation" className="space-y-5">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      )}
      {stored && (
        <>
          <p className="t-caption mb-6">Saved result as it was produced on {new Date(stored.created_at).toLocaleString()}. It is not recomputed when you open it.</p>
          <Report
            result={{ ...stored.result, analysis_id: stored.result.analysis_id ?? id }}
            text={stored.text}
            title={stored.title}
            stamp={new Date(stored.created_at).toLocaleString()}
            onRerun={stored.text ? () => navigate('/analyze', { state: { draft: { mode: 'text', title: stored.title ?? '', text: stored.text, url: '' } } }) : undefined}
          />
        </>
      )}
    </div>
  )
}
