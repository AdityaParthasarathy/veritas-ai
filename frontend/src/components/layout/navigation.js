import { BarChart3, BookOpen, ScanSearch } from 'lucide-react'

/** Primary destinations. Paths are the application's routes and must not change. */
export const NAV_ITEMS = [
  { to: '/analyze', label: 'Investigate', hint: 'Analyze text or an article URL', icon: ScanSearch },
  { to: '/evidence', label: 'Library', hint: 'The reference passages and their sources', icon: BookOpen },
  { to: '/performance', label: 'Method', hint: 'Model metrics and what they do not mean', icon: BarChart3 },
]

/** Routes drawn in the marketing shell (top bar, footer). Everything else uses the application shell (sidebar). */
export const MARKETING_PATHS = ['/']
