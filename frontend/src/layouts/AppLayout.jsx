import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const online = useOnlineStatus()
  const location = useLocation()
  const mainRef = useRef(null)
  const firstRender = useRef(true)

  // Move focus to the content after navigation so keyboard and screen-reader users land on the new page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (event) => event.key === 'Escape' && setNavOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-veritas-card px-4 py-2 text-sm text-veritas-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && (
        <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setNavOpen(false)} />
      )}
      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setNavOpen(true)} menuOpen={navOpen} />
        {!online && (
          <div role="status" className="border-b border-veritas-warning/30 bg-veritas-warning-light px-4 py-2 text-center text-sm text-veritas-warning">
            You are offline. Requests will fail until your connection returns.
          </div>
        )}
        <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-8 lg:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
