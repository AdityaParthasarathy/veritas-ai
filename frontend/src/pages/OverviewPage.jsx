import { CheckCircle2, CircleDashed } from 'lucide-react'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import SystemStatusPanel from '../components/SystemStatusPanel'
import { useSystemStatus } from '../hooks/useSystemStatus'

const IMPLEMENTED = [
  'FastAPI backend with versioned /api/v1 routes',
  'PostgreSQL via Docker Compose with health check',
  'Liveness and readiness endpoints',
  'Typed configuration, CORS and safe error handling',
  'Password-hashing and JWT dependencies prepared (no auth yet)',
]

const UPCOMING = [
  ['NLP preprocessing and classifier training', 'Phase 2'],
  ['Model performance and dataset limitations', 'Phase 2'],
  ['Content analysis and linguistic signals', 'Phase 3'],
  ['Semantic evidence retrieval', 'Phase 3'],
  ['Authentication and stored analyses', 'Phase 4'],
]

export default function OverviewPage() {
  const status = useSystemStatus()

  return (
    <>
      <PageHeader
        title="Misinformation intelligence, grounded in evidence"
        description="VERITAS AI separates machine-learning classification from independently retrieved evidence. A model prediction is a signal, never proof that content is true or false."
        action={<StatusBadge tone="accent">Phase 1 · Foundation</StatusBadge>}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SystemStatusPanel status={status} />
        </div>
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-veritas-text">Implementation status</h2>
          <p className="mt-0.5 text-xs text-veritas-dim">No analysis or model features are available yet.</p>
          <ul className="mt-4 space-y-2.5">
            {IMPLEMENTED.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-veritas-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-veritas-success" strokeWidth={1.75} />
                {item}
              </li>
            ))}
          </ul>
          <div className="my-4 border-t border-veritas-border-subtle" />
          <ul className="space-y-2.5">
            {UPCOMING.map(([item, phase]) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-veritas-dim">
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1">{item}</span>
                <span className="text-xs">{phase}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
