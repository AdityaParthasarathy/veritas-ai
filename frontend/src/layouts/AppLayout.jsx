import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import CommandPalette from '../components/layout/CommandPalette'
import MobileNav from '../components/layout/MobileNav'
import Topbar from '../components/layout/Topbar'
import Logo from '../components/ui/Logo'
import { useHotkey } from '../hooks/useHotkey'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useReadout } from '../hooks/useReadout'

export default function AppLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const online = useOnlineStatus()
  const readout = useReadout()
  const { pathname } = useLocation()
  const mainRef = useRef(null)
  const firstRender = useRef(true)

  useHotkey('mod+k', () => setPaletteOpen((open) => !open), { allowInInputs: true })

  // After navigation, move focus to the content so keyboard and screen-reader users land on the new page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-[90] rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink-0 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to main content
      </a>
      <Topbar readout={readout} onOpenPalette={() => setPaletteOpen(true)} onOpenMobileNav={() => setNavOpen(true)} />
      {!online && (
        <div role="status" className="border-b border-caution/30 bg-caution/10 px-4 py-2 text-center text-sm text-caution">
          You are offline. Requests will fail until your connection returns.
        </div>
      )}
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <div key={pathname} className="page-enter">
          <Outlet context={{ readout }} />
        </div>
      </main>
      <footer className="no-print border-t border-line">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link to="/" aria-label="Veritas home" className="rounded">
            <Logo />
          </Link>
          <p className="t-caption max-w-xl">
            A statistical instrument, not a fact-checker. It measures writing style, retrieves related reference passages and reports how far to trust the analysis. It cannot establish what is true.
          </p>
        </div>
      </footer>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
    </div>
  )
}
