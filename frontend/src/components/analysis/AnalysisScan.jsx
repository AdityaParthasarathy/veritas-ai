import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Button from '../ui/Button'

// The real steps the server performs for one request (see backend/app/services/analysis_service.py).
// The API returns only when all are finished; it does not report which step is currently running.
const PIPELINE = [
  { id: 'fetch', label: 'Fetch the page and extract the article text', only: 'url' },
  { id: 'signals', label: 'Measure linguistic indicators (spaCy)' },
  { id: 'style', label: 'Read the writing style (TF-IDF and logistic regression)' },
  { id: 'domain', label: 'Check whether the text resembles the training articles' },
  { id: 'evidence', label: 'Retrieve related reference passages (TF-IDF lexical match)' },
  { id: 'trust', label: 'Assess how far to trust the analysis' },
]

const clock = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/**
 * The analysing state. The submitted text is scanned by one sweeping line (a real, bounded wait: one request is in
 * flight). The pipeline list is a description of the server's work, shown without invented per-step progress.
 */
export default function AnalysisScan({ mode, title, text, url, onCancel }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const steps = PIPELINE.filter((step) => !step.only || step.only === mode)
  return (
    <div className="animate-fade-in grid gap-8 lg:grid-cols-12" role="status" aria-live="polite" aria-label="Analysis in progress">
      <div className="panel relative overflow-hidden lg:col-span-8">
        <div className="relative max-h-[28rem] min-h-64 overflow-hidden p-6 sm:p-8">
          {title && <p className="font-display mb-4 text-2xl leading-tight text-paper/80">{title}</p>}
          {mode === 'text' ? (
            <p className="t-galley line-clamp-[14] whitespace-pre-line text-paper/45">{text}</p>
          ) : (
            <p className="t-data break-all text-lg text-paper/60">{url}</p>
          )}
          {/* The sweep. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="animate-scan absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-violet/[0.14] to-transparent">
              <div className="absolute inset-x-0 bottom-1/2 h-px bg-signal" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-6 py-3">
          <span className="t-meta">elapsed {clock(elapsed)}</span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="lg:col-span-4">
        <h2 className="t-h3">What the server is doing</h2>
        <ol className="mt-4 space-y-2.5">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3 text-[0.875rem] leading-snug text-steel">
              <span aria-hidden="true" className="animate-pulse-soft mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
              {step.label}
            </li>
          ))}
        </ol>
        <p className="t-caption mt-5">The server answers once, when every step is finished. It does not report which step is running, so none is shown as complete.</p>
        {elapsed >= 6 && <p className="t-caption mt-3 text-caution">The first analysis after the server starts also loads the models and can take around fifteen seconds.</p>}
      </div>
    </div>
  )
}
