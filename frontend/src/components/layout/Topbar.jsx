import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu as MenuIcon, Search } from 'lucide-react'
import Button from '../ui/Button'
import Kbd from '../ui/Kbd'
import Logo from '../ui/Logo'
import { NAV_ITEMS } from './navigation'
import ReadoutPip from './ReadoutPip'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/**
 * The one navigation bar for every page. Sticky; it is transparent over the hero and gains a surface and a border
 * once the page scrolls. The active destination is marked by a sliding indicator.
 */
export default function Topbar({ readout, onOpenPalette, onOpenMobileNav }) {
  const { pathname } = useLocation()
  const listRef = useRef(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false })
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  return (
    <header className={`no-print sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-base ${scrolled ? 'border-line bg-ink-0/80 backdrop-blur-md' : 'border-transparent bg-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-[88rem] items-center gap-6 px-4 sm:px-8">
        <Link to="/" aria-label="VERITAS AI home" className="shrink-0 rounded">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="relative ml-4 hidden h-full lg:block">
          <ul ref={listRef} className="relative flex h-full items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => `press relative block rounded px-3 py-2 text-sm font-medium transition-colors duration-fast ${isActive ? 'text-paper' : 'text-steel hover:text-paper'}`}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-px h-0.5 rounded-full bg-signal-gradient transition-[transform,width,opacity] duration-slow ease-out"
              style={{ width: indicator.width, transform: `translateX(${indicator.left}px)`, opacity: indicator.visible ? 1 : 0 }}
            />
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden xl:inline-flex">
            <ReadoutPip readout={readout} withLabel />
          </span>
          <span className="xl:hidden">
            <ReadoutPip readout={readout} />
          </span>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open command palette"
            className="press inline-flex items-center gap-2 rounded-md border border-line bg-ink-2/50 p-2 text-[0.8125rem] text-dim hover:border-violet hover:text-steel xl:px-3.5 xl:py-1.5"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden xl:inline">Search</span>
            <span className="ml-2 hidden gap-1 xl:flex">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <Button to="/analyze" size="sm" className="hidden lg:inline-flex">
            Start investigating
          </Button>
          <button type="button" onClick={onOpenMobileNav} aria-label="Open navigation menu" className="press rounded-md p-2 text-steel hover:bg-ink-3 hover:text-paper lg:hidden">
            <MenuIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
