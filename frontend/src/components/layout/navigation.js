import { BarChart3, BookOpen, FolderClock, LibraryBig, ScanSearch, Settings } from 'lucide-react'

/** Primary destinations. Paths are the application's routes. */
export const NAV_ITEMS = [
  { to: '/analyze', label: 'Investigate', hint: 'Analyze text or an article URL', icon: ScanSearch },
  { to: '/casebook', label: 'Casebook', hint: 'Invented example investigations you can reproduce', icon: BookOpen },
  { to: '/evidence', label: 'Library', hint: 'The reference passages and their sources', icon: LibraryBig },
  { to: '/performance', label: 'Method', hint: 'How it works, with model metrics and their limits', icon: BarChart3 },
]

/** Signed-in destinations. */
export const SAVED_ITEM = { to: '/history', label: 'Saved investigations', hint: 'Investigations saved to your account', icon: FolderClock }
export const SETTINGS_ITEM = { to: '/settings', label: 'Settings', hint: 'Account, password, deletion', icon: Settings }
