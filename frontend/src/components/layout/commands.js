import { FileText, LogIn, LogOut } from 'lucide-react'
import { EXAMPLES } from '../../data/examples'
import { DASHBOARD_ITEM, NAV_ITEMS } from './navigation'

/** Entries reachable from the command palette. Exported separately so tests can check what the keyboard can reach. */
export function buildCommands({ user }) {
  const items = [
    { id: 'home', group: 'Go to', label: 'Home', to: '/' },
    ...(user ? [{ id: 'dashboard', group: 'Go to', label: DASHBOARD_ITEM.label, hint: DASHBOARD_ITEM.hint, to: DASHBOARD_ITEM.to, icon: DASHBOARD_ITEM.icon }] : []),
    ...NAV_ITEMS.map((n) => ({ id: n.to, group: 'Go to', label: n.label, hint: n.hint, to: n.to, icon: n.icon })),
  ]
  if (user) items.push({ id: 'settings', group: 'Go to', label: 'Settings', hint: 'Account, password, deletion', to: '/settings' })
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
  if (user) items.push({ id: 'signout', group: 'Account', label: 'Sign out', action: 'signout', icon: LogOut })
  else items.push({ id: 'signin', group: 'Account', label: 'Sign in', to: '/login', icon: LogIn }, { id: 'register', group: 'Account', label: 'Create an account', to: '/register', icon: LogIn })
  return items
}
