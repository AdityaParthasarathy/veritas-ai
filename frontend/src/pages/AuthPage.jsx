import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Card from '../components/common/Card'
import { useAuth } from '../context/AuthContext'
import { describeError } from '../services/analysisService'

const INPUT =
  'w-full rounded-lg border border-veritas-border-subtle bg-veritas-bg/60 px-3 py-2 text-sm text-veritas-text outline-none transition-colors placeholder:text-veritas-dim focus:border-veritas-primary'

/** Shared sign-in / create-account form. */
export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, login, register, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const destination = location.state?.from || '/analyze'
  if (user) return <Navigate to={destination} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (isRegister) await register(email.trim(), password, fullName.trim())
      else await login(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md pt-4">
      <h1 className="mb-1.5 text-2xl font-semibold tracking-tight text-veritas-text">
        {isRegister ? 'Create your account' : 'Sign in'}
      </h1>
      <p className="mb-6 text-sm text-veritas-muted">
        {isRegister ? 'Save your analyses and revisit them later.' : 'Sign in to save and review your analyses.'}
      </p>

      {sessionExpired && !isRegister && (
        <div role="status" className="mb-4 rounded-lg border border-veritas-warning/30 bg-veritas-warning-light p-3 text-sm text-veritas-warning">
          Your session expired. Please sign in again.
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
          {isRegister && (
            <div>
              <label htmlFor="full_name" className="mb-1.5 block text-xs font-medium text-veritas-muted">
                Name <span className="text-veritas-dim">(optional)</span>
              </label>
              <input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} autoComplete="name" className={INPUT} />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-veritas-muted">
              Email
            </label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={INPUT} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-veritas-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={isRegister ? 10 : 1}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className={INPUT}
            />
            {isRegister && <p className="mt-1.5 text-xs text-veritas-dim">At least 10 characters.</p>}
          </div>
          {error && (
            <div role="alert" className="rounded-lg border border-veritas-error/30 bg-veritas-error-light p-3 text-sm text-veritas-error">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-veritas-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-veritas-primary-hover disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-veritas-muted">
        {isRegister ? 'Already have an account?' : 'New here?'}{' '}
        <Link to={isRegister ? '/login' : '/register'} state={location.state} className="text-veritas-cyan hover:underline">
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </div>
  )
}
