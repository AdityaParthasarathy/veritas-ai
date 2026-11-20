import { NavLink } from 'react-router-dom'
import Logo from '../common/Logo'
import { NAV_ITEMS } from './navigation'

export default function Sidebar({ open, onNavigate }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-veritas-border-subtle bg-veritas-secondary/95 backdrop-blur transition-transform duration-200 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon, implemented }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-veritas-primary-light text-veritas-text'
                  : 'text-veritas-muted hover:bg-white/5 hover:text-veritas-text'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1">{label}</span>
            {!implemented && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-veritas-dim">
                Soon
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-veritas-border-subtle p-4 text-xs leading-relaxed text-veritas-dim">
        Phase 3 · Analysis API
        <br />
        Model outputs are signals, not proof of truth.
      </div>
    </aside>
  )
}
