import { BarChart3, BookOpen, FolderClock, LayoutDashboard, ScanSearch, Settings } from 'lucide-react'

/** Primary destinations. Paths are the application's routes and must not change. */
export const NAV_ITEMS = [
  { to: '/analyze', label: 'Investigate', hint: 'Analyze text or an article URL', icon: ScanSearch },
  { to: '/history', label: 'Casebook', hint: 'Your saved investigations', icon: FolderClock },
  { to: '/evidence', label: 'Library', hint: 'The reference passages and their sources', icon: BookOpen },
  { to: '/performance', label: 'Method', hint: 'Model metrics and what they do not mean', icon: BarChart3 },
]

/** Signed-in destinations that sit around the primary set. */
export const DASHBOARD_ITEM = { to: '/dashboard', label: 'Dashboard', hint: 'Your activity and system status', icon: LayoutDashboard }
export const SETTINGS_ITEM = { to: '/settings', label: 'Settings', hint: 'Account, password, deletion', icon: Settings }

/** Routes drawn in the marketing shell (top bar, footer). Everything else uses the application shell (sidebar). */
export const MARKETING_PATHS = ['/', '/login', '/register']
