import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import Report from '../components/report/Report'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { getCase, RECORDED_ON } from '../data/cases'
import NotFoundPage from './NotFoundPage'

/** One invented case: why it exists, the input, and the full recorded report from the live system. */
export default function CaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const item = getCase(id)
  if (!item) return <NotFoundPage />
  const run = () => navigate('/analyze', { state: { draft: { mode: 'text', title: '', text: item.text, url: '' } } })

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">
      <Link to="/casebook" className="mb-8 inline-flex items-center gap-1.5 text-[0.8125rem] text-dim transition-colors duration-fast hover:text-paper">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to the Casebook
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="brand">{item.kind}</Badge>
            <Badge>Invented example</Badge>
          </div>
          <h1 className="t-h1">{item.title}</h1>
          <p className="t-lead mt-4">{item.why}</p>
        </div>
        <Button size="lg" onClick={run}>
          <Play className="h-4 w-4" aria-hidden="true" />
          Run this case
        </Button>
      </div>

      <section aria-labelledby="input-title" className="panel mb-12 p-6 sm:p-8">
        <h2 id="input-title" className="t-h3 mb-1">
          The input
        </h2>
        <p className="t-caption mb-4">Written for this project. Not real news.</p>
        <div className="max-h-72 overflow-y-auto pr-3" tabIndex={0} aria-label="Case input text">
          {item.text.split('\n').filter(Boolean).map((paragraph, i) => (
            <p key={i} className="t-galley mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {item.recorded ? (
        <>
          <p className="t-caption mb-6">
            Recorded output: this report is the response the live analysis pipeline gave for this input on {RECORDED_ON}. Run the case to reproduce it; numbers can differ slightly if the classifier is retrained.
          </p>
          <Report result={item.recorded} text={item.text} title={item.title} stamp={`recorded ${RECORDED_ON}`} />
        </>
      ) : (
        <p className="t-body">No recorded output is available for this case. Run it to see a live report.</p>
      )}
    </div>
  )
}
