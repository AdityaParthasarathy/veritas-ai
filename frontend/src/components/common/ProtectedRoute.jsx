import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/** Renders children only for signed-in users; otherwise redirects to the login page and remembers the target. */
export default function ProtectedRoute({ children }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  if (checking) return <p role="status" className="t-body mx-auto max-w-[88rem] px-4 py-16 sm:px-8">Checking your session…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
