import { FileText, ScanSearch } from 'lucide-react'
import { EXAMPLES } from '../../data/examples'
import { NAV_ITEMS } from './navigation'

/** Entries reachable from the command palette. Exported separately so tests can check what the keyboard can reach. */
export function buildCommands() {
  const items = [
    { id: 'new', group: 'Go to', label: 'Start an investigation', hint: 'Paste text or an article address', to: '/analyze', icon: ScanSearch },
    { id: 'home', group: 'Go to', label: 'Home', to: '/' },
    ...NAV_ITEMS.filter((n) => n.to !== '/analyze').map((n) => ({ id: n.to, group: 'Go to', label: n.label, hint: n.hint, to: n.to, icon: n.icon })),
  ]
  items.push(
    ...EXAMPLES.map((e) => ({
      id: `example-${e.id}`,
      group: 'Load a demo input',
      label: e.title,
      hint: e.kind,
      to: '/analyze',
      state: { example: e.id },
      icon: FileText,
    })),
  )
  return items
}
