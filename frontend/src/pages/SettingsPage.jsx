import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { describeError } from '../services/analysisService'

function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
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
      toast({ title: 'Password changed', description: 'Other devices have been signed out.' })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <Input id="current-password" label="Current password" type="password" required autoComplete="current-password" maxLength={72} value={current} onChange={(e) => setCurrent(e.target.value)} />
      <Input id="new-password" label="New password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" hint="At least 10 characters." value={next} onChange={(e) => setNext(e.target.value)} />
      <Input id="confirm-password" label="Confirm new password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && (
        <p role="alert" className="rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
          {error}
        </p>
      )}
      <Button type="submit" loading={busy}>
        Change password
      </Button>
    </form>
  )
}

function DeleteAccount() {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const passwordRef = useRef(null)

  const close = () => {
    if (busy) return
    setOpen(false)
    setPassword('')
    setConfirmed(false)
    setError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(password)
      toast({ title: 'Account deleted', description: 'Your saved investigations were removed.' })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }

  return (
    <>
      <p className="t-body">Permanently deletes your account and every saved investigation. This cannot be undone.</p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <Modal open={open} onClose={close} title="Delete your account?" description="Your account and all saved investigations will be removed permanently." initialFocusRef={passwordRef}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input ref={passwordRef} id="delete-password" label="Confirm with your password" type="password" required autoComplete="current-password" maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="flex items-start gap-3 text-sm text-steel">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-[#57D8E6]" />
            I understand that my account and all saved investigations will be permanently deleted.
          </label>
          {error && (
            <p role="alert" className="rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={!confirmed || !password} loading={busy}>
              Permanently delete
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">
      <h1 className="t-h1 mb-12">Settings</h1>
      <div className="divide-y divide-line border-y border-line">
        <section aria-labelledby="s-profile" className="grid gap-x-16 gap-y-6 py-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="s-profile" className="t-h2">
              Profile
            </h2>
            <p className="t-caption mt-1">Sessions last 30 minutes and are kept in this browser tab only.</p>
          </div>
          <div className="lg:col-span-8">
            <dl className="max-w-xl divide-y divide-line">
              {[
                ['Name', user.full_name || 'Not set'],
                ['Email', user.email],
                ['Member since', new Date(user.created_at).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-dim">{k}</dt>
                  <dd className="text-paper">{v}</dd>
                </div>
              ))}
            </dl>
            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Sign out
            </Button>
          </div>
        </section>
        <section aria-labelledby="s-password" className="grid gap-x-16 gap-y-6 py-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="s-password" className="t-h2">
              Password
            </h2>
            <p className="t-caption mt-1">Changing it signs out every other device.</p>
          </div>
          <div className="lg:col-span-8">
            <ChangePasswordForm />
          </div>
        </section>
        <section aria-labelledby="s-delete" className="grid gap-x-16 gap-y-6 py-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="s-delete" className="t-h2">
              Delete account
            </h2>
          </div>
          <div className="lg:col-span-8">
            <DeleteAccount />
          </div>
        </section>
      </div>
    </div>
  )
}
