import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
