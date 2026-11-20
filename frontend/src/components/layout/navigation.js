import { BarChart3, BookOpen, FolderClock, ScanSearch } from 'lucide-react'

/** Primary destinations. Paths are the application's routes and must not change. */
export const NAV_ITEMS = [
  { to: '/analyze', label: 'Investigate', hint: 'Analyze text or an article URL', icon: ScanSearch },
  { to: '/history', label: 'Casebook', hint: 'Your saved investigations', icon: FolderClock },
  { to: '/evidence', label: 'Library', hint: 'The reference passages and their sources', icon: BookOpen },
  { to: '/performance', label: 'Method', hint: 'Model metrics and what they do not mean', icon: BarChart3 },
]
