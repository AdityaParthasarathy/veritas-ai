import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import CommandPalette from '../components/layout/CommandPalette'
import MobileNav from '../components/layout/MobileNav'
import Topbar from '../components/layout/Topbar'
import Logo from '../components/ui/Logo'
import Skeleton from '../components/ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useHotkey } from '../hooks/useHotkey'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useReadout } from '../hooks/useReadout'

function PageFallback() {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto max-w-[88rem] space-y-5 px-4 py-14 sm:px-8">
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
    </div>
  )
}

function Footer() {
  const { user } = useAuth()
  const column = 'space-y-2.5 text-sm'
  const link = 'text-steel transition-colors duration-fast hover:text-paper'
  return (
    <footer className="no-print border-t border-line bg-ink-1/60">
      <div className="mx-auto grid max-w-[88rem] gap-10 px-4 py-12 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Link to="/" aria-label="VERITAS AI home" className="inline-block rounded">
            <Logo />
          </Link>
          <p className="t-caption mt-4 max-w-md">
            A statistical instrument, not a fact-checker. It measures writing style, retrieves related reference passages and reports how far to trust the analysis. It cannot establish what is true.
          </p>
        </div>
        <nav aria-label="Footer product" className="lg:col-span-2 lg:col-start-7">
          <p className="t-eyebrow mb-3">Product</p>
          <ul className={column}>
            <li><Link to="/analyze" className={link}>Investigate</Link></li>
            <li><Link to="/casebook" className={link}>Casebook</Link></li>
            <li><Link to="/evidence" className={link}>Library</Link></li>
          </ul>
        </nav>
        <nav aria-label="Footer account" className="lg:col-span-2">
          <p className="t-eyebrow mb-3">Account</p>
          <ul className={column}>
            {user ? (
              <>
                <li><Link to="/history" className={link}>Saved investigations</Link></li>
                <li><Link to="/settings" className={link}>Settings</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/login" className={link}>Sign in</Link></li>
                <li><Link to="/register" className={link}>Create an account</Link></li>
              </>
            )}
          </ul>
        </nav>
        <nav aria-label="Footer method" className="lg:col-span-2">
          <p className="t-eyebrow mb-3">Method</p>
          <ul className={column}>
            <li><Link to="/performance" className={link}>How it is measured</Link></li>
            <li><Link to="/#limits" className={link}>Limitations</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="t-meta mx-auto max-w-[88rem] px-4 py-4 sm:px-8">VERITAS AI. Model agreement with dataset labels is not factual accuracy.</p>
      </div>
    </footer>
  )
}

export default function AppLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const online = useOnlineStatus()
  const readout = useReadout()
  const { pathname, hash } = useLocation()
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
    // A footer link such as /#limits: wait a frame for the lazily loaded page to mount, then scroll to the anchor.
    if (hash) requestAnimationFrame(() => setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 60))
  }, [pathname, hash])

  const skip = (
    <a href="#main" className="sr-only z-[90] rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink-0 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
      Skip to main content
    </a>
  )
  const offline = !online && (
    <div role="status" className="border-b border-caution/30 bg-caution/10 px-4 py-2 text-center text-sm text-caution">
      You are offline. Requests will fail until your connection returns.
    </div>
  )
  const content = (
    <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
      <div key={pathname} className="page-enter">
        <Suspense fallback={<PageFallback />}>
          <Outlet context={{ readout }} />
        </Suspense>
      </div>
    </main>
  )
  const overlays = (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      {skip}
      <Topbar readout={readout} onOpenPalette={() => setPaletteOpen(true)} onOpenMobileNav={() => setNavOpen(true)} />
      {offline}
      {content}
      <Footer />
      {overlays}
    </div>
  )
}
