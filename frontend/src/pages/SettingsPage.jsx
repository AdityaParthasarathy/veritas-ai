import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader title="Settings" description="Your account." />
      <Card className="max-w-xl">
        <dl className="divide-y divide-veritas-border-subtle text-sm">
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-veritas-muted">Name</dt>
            <dd className="text-veritas-text">{user.full_name || 'Not set'}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-veritas-muted">Email</dt>
            <dd className="text-veritas-text">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="text-veritas-muted">Member since</dt>
            <dd className="text-veritas-text">{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="mt-5 rounded-lg border border-veritas-border-subtle px-4 py-2 text-sm text-veritas-muted transition-colors hover:border-white/20 hover:text-veritas-text"
        >
          Sign out
        </button>
        <p className="mt-4 text-xs leading-relaxed text-veritas-dim">
          Sessions last 30 minutes and are kept in this browser tab only. Password change and account deletion are not available yet.
        </p>
      </Card>
    </>
  )
}
