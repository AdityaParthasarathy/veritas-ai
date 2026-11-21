import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ReportOverview from '../report/ReportOverview'
import Takeaway from '../report/Takeaway'
import Badge from '../ui/Badge'
import { getCase, RECORDED_ON } from '../../data/cases'

/**
 * A real recorded report (not a mock-up): the live pipeline's response for an invented demo input, rendered by the same
 * components the product uses. Loaded lazily so the landing page stays light.
 */
export default function SampleReport() {
  const item = getCase('03-misleading-sober')
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="brand">Sample report</Badge>
        <Badge>Invented input</Badge>
        <Badge>Recorded {RECORDED_ON}</Badge>
      </div>
      <p className="mb-5 max-w-2xl text-[0.9375rem] text-steel">
        “{item.title}”: a false claim written like ordinary news. The classifier’s reading is reassuring and the claim is still false, which is exactly why the report keeps the three readings apart and says what it has not checked.
      </p>
      <div className="space-y-6">
        <ReportOverview result={item.recorded} />
        <Takeaway result={item.recorded} />
      </div>
      <Link to={`/casebook/${item.id}`} className="mt-5 inline-flex items-center gap-1.5 text-[0.875rem] text-signal underline decoration-signal/30 hover:decoration-signal">
        Open the full recorded report
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}
