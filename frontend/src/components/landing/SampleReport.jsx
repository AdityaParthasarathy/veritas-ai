import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ReportOverview from '../report/ReportOverview'
import Takeaway from '../report/Takeaway'
import Badge from '../ui/Badge'
import { getCase, RECORDED_ON } from '../../data/cases'

/**
 * A real recorded report (not a mock-up) inside a product window: the live pipeline's response for an invented demo
 * input, rendered by the same components the product uses. The lower part fades out; the full report is one link away.
 * Loaded lazily so the landing page stays light.
 */
export default function SampleReport() {
  const item = getCase('03-misleading-sober')
  return (
    <figure className="relative mx-auto max-w-5xl">
      <div aria-hidden="true" className="arc-glow" />
      <div className="relative overflow-hidden rounded-t-2xl border border-b-0 border-line-strong bg-ink-1/90 shadow-[0_-30px_80px_-40px_rgb(128_96_255/0.7)]">
        <div className="flex items-center gap-3 border-b border-line bg-ink-2/70 px-4 py-3">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <figcaption className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">Sample report</Badge>
            <Badge>Invented input</Badge>
            <Badge>Recorded {RECORDED_ON}</Badge>
          </figcaption>
        </div>
        <div className="frame-fade max-h-[34rem] overflow-hidden p-5 sm:p-8">
          <p className="mb-5 max-w-2xl text-[0.9375rem] text-steel">
            “{item.title}”: a false claim written like ordinary news. The classifier’s reading is reassuring and the claim is still false, which is why the report keeps three readings apart and says what it has not checked.
          </p>
          <div className="space-y-6">
            <ReportOverview result={item.recorded} />
            <Takeaway result={item.recorded} />
          </div>
        </div>
      </div>
      <Link to={`/casebook/${item.id}`} className="mt-5 flex items-center justify-center gap-1.5 text-[0.875rem] text-signal underline decoration-signal/30 hover:decoration-signal">
        Open the full recorded report
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </figure>
  )
}
