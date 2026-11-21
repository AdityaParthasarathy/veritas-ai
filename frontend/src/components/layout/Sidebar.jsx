import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../ui/Logo'
import { DASHBOARD_ITEM, NAV_ITEMS, SETTINGS_ITEM } from './navigation'
import ReadoutPip from './ReadoutPip'

function Item({ item }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `press group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-fast ${
          isActive ? 'bg-brand/20 text-paper' : 'text-steel hover:bg-ink-2 hover:text-paper'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span aria-hidden="true" className={`absolute inset-y-2 left-0 w-0.5 rounded-full bg-violet transition-opacity duration-base ${isActive ? 'opacity-100' : 'opacity-0'}`} />
          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-violet' : 'text-dim group-hover:text-steel'}`} aria-hidden="true" />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

/** Application sidebar (large screens). One navigation landmark; the same destinations live in the mobile sheet. */
export default function Sidebar({ readout }) {
  const { user } = useAuth()
  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-ink-1/80 px-3 py-5 lg:flex">
      <Link to="/" aria-label="VERITAS AI home" className="mb-8 rounded px-3">
        <Logo />
      </Link>
      <nav aria-label="Primary" className="flex-1">
        <ul className="space-y-1">
          {user && (
            <li>
              <Item item={DASHBOARD_ITEM} />
            </li>
          )}
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Item item={item} />
            </li>
          ))}
          {user && (
            <li className="pt-3">
              <Item item={SETTINGS_ITEM} />
            </li>
          )}
        </ul>
      </nav>
      <div className="panel space-y-3 p-3">
        <ReadoutPip readout={readout} withLabel />
        {!user && (
          <p className="t-caption">
            <Link to="/login" className="text-signal underline decoration-signal/30 hover:decoration-signal">
              Sign in
            </Link>{' '}
            to keep investigations in a private Casebook.
          </p>
        )}
      </div>
    </aside>
  )
}
