import { useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu as MenuIcon, Search, Settings, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Kbd from '../ui/Kbd'
import Logo from '../ui/Logo'
import Menu from '../ui/Menu'
import { NAV_ITEMS } from './navigation'
import ReadoutPip from './ReadoutPip'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function Topbar({ readout, onOpenPalette, onOpenMobileNav }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const listRef = useRef(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false })

  // Slide the underline to the active destination.
  useLayoutEffect(() => {
    const measure = () => {
      const active = listRef.current?.querySelector('[aria-current="page"]')
      setIndicator(active ? { left: active.offsetLeft, width: active.offsetWidth, visible: true } : (prev) => ({ ...prev, visible: false }))
    }
    measure()
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [pathname])

  const menuItems = [
    { label: 'Casebook', to: '/history', icon: <User className="h-4 w-4" aria-hidden="true" /> },
    { label: 'Settings', to: '/settings', icon: <Settings className="h-4 w-4" aria-hidden="true" /> },
    {
      label: 'Sign out',
      icon: <LogOut className="h-4 w-4" aria-hidden="true" />,
      onSelect: () => {
        logout()
        navigate('/login')
      },
    },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink-0/95">
      <div className="mx-auto flex h-14 max-w-[88rem] items-center gap-6 px-4 sm:px-8">
        <Link to="/" aria-label="Veritas home" className="shrink-0 rounded">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="relative ml-2 hidden h-full md:block">
          <ul ref={listRef} className="relative flex h-full items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `press relative block rounded px-3 py-2 text-sm font-medium transition-colors duration-fast ${isActive ? 'text-paper' : 'text-dim hover:text-steel'}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-px h-px bg-signal transition-[transform,width,opacity] duration-slow ease-out"
              style={{ width: indicator.width, transform: `translateX(${indicator.left}px)`, opacity: indicator.visible ? 1 : 0 }}
            />
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <span className="hidden md:inline-flex"><ReadoutPip readout={readout} withLabel /></span>
          <span className="md:hidden"><ReadoutPip readout={readout} /></span>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open command palette"
            className="press hidden items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-[0.8125rem] text-dim hover:border-line-strong hover:text-steel md:inline-flex"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search
            <span className="ml-3 flex gap-1">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          {user ? (
            <Menu
              label="Account menu"
              items={menuItems}
              triggerClassName="inline-flex h-9 items-center gap-2 rounded-md border border-line px-2.5 text-[0.8125rem] text-steel hover:border-line-strong hover:text-paper"
              trigger={
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-deep font-mono text-[0.6875rem] text-signal" aria-hidden="true">
                    {(user.full_name || user.email).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-32 truncate sm:inline">{user.full_name || user.email}</span>
                </>
              }
            />
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Link to="/login" className="press rounded-md px-3 py-1.5 text-sm text-steel hover:text-paper">
                Sign in
              </Link>
              <Link to="/register" className="press hidden rounded-md border border-line-strong px-3 py-1.5 text-sm text-paper hover:border-signal hover:text-signal-strong lg:inline-flex">
                Create account
              </Link>
            </div>
          )}

          <button type="button" onClick={onOpenMobileNav} aria-label="Open navigation menu" className="press rounded-md p-2 text-steel hover:bg-ink-3 hover:text-paper md:hidden">
            <MenuIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
