import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'
import { describeError } from '../services/analysisService'

const INPUT =
  'w-full rounded-lg border border-veritas-border-subtle bg-veritas-bg/60 px-3 py-2 text-sm text-veritas-text outline-none transition-colors placeholder:text-veritas-dim focus:border-veritas-primary'

function Field({ id, label, hint, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-veritas-muted">
        {label}
      </label>
      <input id={id} className={INPUT} {...props} />
      {hint && <p className="mt-1.5 text-xs text-veritas-dim">{hint}</p>}
    </div>
  )
}

function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setDone(false)
    if (next !== confirm) {
      setError('The new passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(true)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-xl">
      <h2 className="mb-4 text-sm font-semibold text-veritas-text">Change password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="current-password" label="Current password" type="password" required autoComplete="current-password" maxLength={72} value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Field id="new-password" label="New password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" hint="At least 10 characters." value={next} onChange={(e) => setNext(e.target.value)} />
        <Field id="confirm-password" label="Confirm new password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <div aria-live="polite">
          {error && (
            <p role="alert" className="rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3 text-sm text-veritas-error">
              {error}
            </p>
          )}
          {done && (
            <p role="status" className="rounded-lg border border-veritas-success/30 bg-veritas-success-light p-3 text-sm text-veritas-success">
              Password changed. Other devices have been signed out.
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-veritas-primary-solid px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-veritas-primary-solid-hover disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Change password
        </button>
      </form>
    </Card>
  )
}

function DeleteAccountForm() {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-xl border-veritas-error/30">
      <h2 className="text-sm font-semibold text-veritas-text">Delete account</h2>
      <p className="mt-1.5 text-sm text-veritas-muted">Permanently deletes your account and every saved analysis. This cannot be undone.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-lg border border-veritas-error/40 px-4 py-2 text-sm text-veritas-error transition-colors hover:bg-veritas-error-light">
          Delete my account…
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field id="delete-password" label="Confirm with your password" type="password" required autoComplete="current-password" maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="flex items-start gap-2 text-sm text-veritas-muted">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            I understand that my account and all saved analyses will be permanently deleted.
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3 text-sm text-veritas-error">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={busy || !confirmed || !password} className="inline-flex items-center gap-2 rounded-lg bg-veritas-error px-4 py-2 text-sm font-medium text-veritas-bg transition-opacity disabled:opacity-40">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Permanently delete
            </button>
            <button type="button" onClick={() => { setOpen(false); setPassword(''); setConfirmed(false); setError(null) }} className="rounded-lg border border-veritas-border-subtle px-4 py-2 text-sm text-veritas-muted hover:text-veritas-text">
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader title="Settings" description="Your account." />
      <div className="space-y-6">
        <Card className="max-w-xl">
          <h2 className="mb-2 text-sm font-semibold text-veritas-text">Profile</h2>
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
          <p className="mt-4 text-xs leading-relaxed text-veritas-dim">Sessions last 30 minutes and are kept in this browser tab only.</p>
        </Card>
        <ChangePasswordForm />
        <DeleteAccountForm />
      </div>
    </>
  )
}
