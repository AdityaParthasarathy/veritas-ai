import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { useAuth } from '../context/AuthContext'
import { describeError } from '../services/analysisService'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Sign-in and account creation share one composition: the instrument on one side, the form on the other. */
export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, login, register, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const destination = location.state?.from || '/analyze'
  if (user) return <Navigate to={destination} replace />

  const emailError = attempted && !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : null
  const passwordError = attempted && (isRegister ? password.length < 10 : password.length === 0) ? (isRegister ? 'Use at least 10 characters.' : 'Enter your password.') : null

  async function handleSubmit(event) {
    event.preventDefault()
    setAttempted(true)
    if (!EMAIL.test(email.trim()) || (isRegister ? password.length < 10 : password.length === 0)) return
    setBusy(true)
    setError(null)
    try {
      if (isRegister) await register(email.trim(), password, fullName.trim())
      else await login(email.trim(), password)
      navigate(destination, { replace: true, state: location.state?.draft ? { draft: location.state.draft } : undefined })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-line bg-ink-1 lg:flex lg:flex-col lg:justify-between">
        <div className="flex flex-1 items-center px-10 pt-10">
          <ol className="max-w-sm divide-y divide-line border-y border-line">
            {[
              ['01', 'Writing style', 'Which labelled group the wording resembles.'],
              ['02', 'Evidence relevance', 'Which reference passages are close in meaning.'],
              ['03', 'Trust in the analysis', 'How far to rely on the two readings above.'],
            ].map(([n, title, body]) => (
              <li key={n} className="flex gap-4 py-4">
                <span className="font-mono text-[0.75rem] text-violet">{n}</span>
                <div>
                  <p className="text-[0.9375rem] font-semibold text-paper">{title}</p>
                  <p className="t-caption mt-0.5">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="border-t border-line/70 px-10 py-8">
          <p className="font-display text-[clamp(1.5rem,2.4vw,2.25rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-paper">Confidence is not truth.</p>
          <p className="t-caption mt-3 max-w-sm">A model can be certain and wrong. VERITAS AI reports how sure the model is separately from how far the analysis can be trusted.</p>
        </div>
      </aside>

      <div className="flex items-center px-4 py-12 sm:px-10 lg:px-16">
        <div key={mode} className="page-enter glass w-full max-w-md rounded-xl p-6 sm:p-8">
          <p className="t-eyebrow mb-3">{isRegister ? 'Create account' : 'Welcome back'}</p>
          <h1 className="t-h1">{isRegister ? 'Create an account' : 'Sign in'}</h1>
          <p className="t-body mt-3">{isRegister ? 'Keep your investigations in a private list of saved investigations. Anonymous use stays available.' : 'Return to your saved investigations.'}</p>

          {sessionExpired && !isRegister && (
            <div role="status" className="mt-6 rounded-md border border-caution/40 bg-caution/10 px-4 py-3 text-sm text-caution">
              Your session expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {isRegister && <Input label="Name" optional value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} autoComplete="name" />}
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" error={emailError} />
            <Input
              label="Password"
              type={reveal ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={72}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              hint={isRegister ? 'At least 10 characters.' : undefined}
              error={passwordError}
              suffix={
                <button type="button" onClick={() => setReveal((v) => !v)} aria-pressed={reveal} aria-label={reveal ? 'Hide password' : 'Show password'} className="press rounded-md p-2 text-dim hover:text-paper">
                  {reveal ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              }
            />
            {error && (
              <div role="alert" className="rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="t-body mt-6">
            {isRegister ? 'Already have an account?' : 'New to Veritas?'}{' '}
            <Link to={isRegister ? '/login' : '/register'} state={location.state} className="text-signal underline decoration-signal/30 hover:decoration-signal">
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
