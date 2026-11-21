import { FileText } from 'lucide-react'
import { EXAMPLES } from '../../data/examples'
import { NAV_ITEMS } from './navigation'

/** Entries reachable from the command palette. Exported separately so tests can check what the keyboard can reach. */
export function buildCommands() {
  return [
    { id: 'home', group: 'Go to', label: 'Home', to: '/' },
    ...NAV_ITEMS.map((n) => ({ id: n.to, group: 'Go to', label: n.label, hint: n.hint, to: n.to, icon: n.icon })),
    ...EXAMPLES.map((e) => ({
      id: `example-${e.id}`,
      group: 'Load a demo input',
      label: e.title,
      hint: e.kind,
      to: '/analyze',
      state: { example: e.id },
      icon: FileText,
    })),
  ]
}
