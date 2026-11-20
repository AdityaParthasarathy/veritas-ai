import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Modal from '../ui/Modal'
import { NAV_ITEMS } from './navigation'

/** Full navigation for narrow screens, presented as a bottom sheet with focus management. */
export default function MobileNav({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const link = 'press flex items-baseline justify-between rounded-md px-1 py-3 font-display text-2xl text-paper hover:text-signal-strong'
  return (
    <Modal open={open} onClose={onClose} title="Navigate">
      <nav aria-label="Mobile">
        <ul className="divide-y divide-line">
          <li>
            <Link to="/" onClick={onClose} className={link}>
              Overview
            </Link>
          </li>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={onClose} className={link}>
                {item.label}
                <span className="t-caption ml-4 hidden text-right font-sans text-sm min-[420px]:block">{item.hint}</span>
              </Link>
            </li>
          ))}
          {user && (
            <li>
              <Link to="/settings" onClick={onClose} className={link}>
                Settings
              </Link>
            </li>
          )}
        </ul>
      </nav>
      <div className="mt-5 flex gap-2 border-t border-line pt-5">
        {user ? (
          <button
            type="button"
            className="press h-11 flex-1 rounded-md border border-line-strong text-sm text-steel hover:text-paper"
            onClick={() => {
              logout()
              onClose()
              navigate('/login')
            }}
          >
            Sign out
          </button>
        ) : (
          <>
            <Link to="/login" onClick={onClose} className="press flex h-11 flex-1 items-center justify-center rounded-md border border-line-strong text-sm text-steel hover:text-paper">
              Sign in
            </Link>
            <Link to="/register" onClick={onClose} className="press flex h-11 flex-1 items-center justify-center rounded-md bg-signal text-sm font-medium text-ink-0 hover:bg-signal-strong">
              Create account
            </Link>
          </>
        )}
      </div>
    </Modal>
  )
}
