import { AlertTriangle, Database, RefreshCw, Server } from 'lucide-react'
import Card from './common/Card'
import StatusBadge from './common/StatusBadge'
import { API_ORIGIN } from '../services/api'

function StatusRow({ icon: Icon, label, detail, loading, tone, text }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="rounded-lg bg-white/5 p-2 text-veritas-muted">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-veritas-text">{label}</div>
        <div className="truncate font-mono text-xs text-veritas-dim">{detail}</div>
      </div>
      {loading ? (
        <StatusBadge tone="neutral" pulse>
          Checking…
        </StatusBadge>
      ) : (
        <StatusBadge tone={tone}>{text}</StatusBadge>
      )}
    </div>
  )
}

export default function SystemStatusPanel({ status }) {
  const { loading, backend, database, info, error, checkedAt, refresh } = status

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 border-b border-veritas-border-subtle px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-veritas-text">System status</h2>
          <p className="mt-0.5 truncate text-xs text-veritas-dim">
            Live checks against <span className="font-mono">{API_ORIGIN}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-veritas-border-subtle px-3 py-1.5 text-xs font-medium text-veritas-muted transition-colors hover:border-white/20 hover:text-veritas-text disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {error ? 'Retry' : 'Refresh'}
        </button>
      </div>

      {error && !loading && (
        <div role="alert" className="mx-5 mt-4 flex gap-3 rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3.5 text-sm text-veritas-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Backend unavailable</div>
            <div className="mt-0.5 text-xs leading-relaxed opacity-90">{error}</div>
          </div>
        </div>
      )}

      <div className="divide-y divide-veritas-border-subtle px-5">
        <StatusRow
          icon={Server}
          label="API server"
          detail="GET /api/v1/health/live"
          loading={loading}
          tone={backend === 'online' ? 'success' : 'error'}
          text={backend === 'online' ? 'Online' : 'Offline'}
        />
        <StatusRow
          icon={Database}
          label="PostgreSQL database"
          detail="GET /api/v1/health/ready"
          loading={loading}
          tone={database === 'connected' ? 'success' : database === 'disconnected' ? 'error' : 'neutral'}
          text={database === 'connected' ? 'Connected' : database === 'disconnected' ? 'Disconnected' : 'Unknown'}
        />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-veritas-border-subtle px-5 py-3 text-xs text-veritas-dim">
        {info && (
          <>
            <span>
              Version <span className="font-mono text-veritas-muted">{info.version}</span>
            </span>
            <span>
              Environment <span className="font-mono text-veritas-muted">{info.environment}</span>
            </span>
          </>
        )}
        {checkedAt && <span>Last checked {checkedAt.toLocaleTimeString()}</span>}
      </div>
    </Card>
  )
}
