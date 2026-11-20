import { Hourglass } from 'lucide-react'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'

/** Honest placeholder for features that are not built yet. Shows no fabricated data. */
export default function UpcomingPage({ title, description, phase, planned }) {
  return (
    <>
      <PageHeader title={title} description={description} action={<StatusBadge tone="warning">Planned · {phase}</StatusBadge>} />
      <Card className="max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-white/5 p-2.5 text-veritas-muted">
            <Hourglass className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-veritas-text">Not implemented yet</h2>
            <p className="mt-1 text-sm leading-relaxed text-veritas-muted">
              This feature is part of a later development phase. No data is shown here because none exists yet.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-veritas-muted">
              {planned.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-veritas-dim" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </>
  )
}
