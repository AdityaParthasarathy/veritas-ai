import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Modal from '../ui/Modal'
import { NAV_ITEMS, SAVED_ITEM, SETTINGS_ITEM } from './navigation'

/** Full navigation for narrow screens, presented as a bottom sheet with focus management. */
export default function MobileNav({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const link = 'press flex items-baseline justify-between rounded-md px-1 py-3 text-lg font-semibold tracking-tight text-paper hover:text-violet'
  const items = [...NAV_ITEMS, ...(user ? [SAVED_ITEM, SETTINGS_ITEM] : [])]
  return (
    <Modal open={open} onClose={onClose} title="Navigate">
      <nav aria-label="Mobile">
        <ul className="divide-y divide-line">
          <li>
            <Link to="/" onClick={onClose} className={link}>
              Home
            </Link>
          </li>
          {items.map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={onClose} className={link}>
                {item.label}
                <span className="t-caption ml-4 hidden text-right font-sans text-sm font-normal min-[460px]:block">{item.hint}</span>
              </Link>
            </li>
          ))}
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
            <Link to="/register" onClick={onClose} className="press flex h-11 flex-1 items-center justify-center rounded-md bg-brand-gradient text-sm font-medium text-white shadow-glow hover:brightness-110">
              Create account
            </Link>
          </>
        )}
      </div>
    </Modal>
  )
}
