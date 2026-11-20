import { Menu } from 'lucide-react'
import Logo from '../common/Logo'

export default function Topbar({ onMenuClick, menuOpen = false }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-veritas-border-subtle bg-veritas-bg/80 px-4 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        className="rounded-lg p-2 text-veritas-muted transition-colors hover:bg-white/5 hover:text-veritas-text"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Logo />
    </header>
  )
}
