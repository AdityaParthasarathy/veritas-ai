import { BarChart3, FileSearch, History, LayoutDashboard, Library, Settings } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, implemented: true },
  { to: '/analyze', label: 'Analyze Content', icon: FileSearch, implemented: true },
  { to: '/history', label: 'Analysis History', icon: History, implemented: false },
  { to: '/evidence', label: 'Evidence Explorer', icon: Library, implemented: true },
  { to: '/performance', label: 'Model Performance', icon: BarChart3, implemented: false },
  { to: '/settings', label: 'Settings', icon: Settings, implemented: false },
]
