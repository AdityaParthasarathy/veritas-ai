import { FileText, LogIn, LogOut, ScanSearch, Search, UserPlus } from 'lucide-react'
import { EXAMPLES } from '../../data/examples'
import { NAV_ITEMS, SAVED_ITEM, SETTINGS_ITEM } from './navigation'

/** Entries reachable from the command palette. Exported separately so tests can check what the keyboard can reach. */
export function buildCommands({ user }) {
  const items = [
    { id: 'new', group: 'Go to', label: 'Start an investigation', hint: 'Paste text or an article address', to: '/analyze', icon: ScanSearch },
    { id: 'home', group: 'Go to', label: 'Home', to: '/' },
    ...NAV_ITEMS.filter((n) => n.to !== '/analyze').map((n) => ({ id: n.to, group: 'Go to', label: n.label, hint: n.hint, to: n.to, icon: n.icon })),
  ]
  if (user) {
    items.push(
      { id: 'saved', group: 'Go to', label: SAVED_ITEM.label, hint: SAVED_ITEM.hint, to: SAVED_ITEM.to, icon: SAVED_ITEM.icon },
      { id: 'search-saved', group: 'Go to', label: 'Search saved investigations', hint: 'Opens your saved investigations with the search box focused', to: '/history', state: { focusSearch: true }, icon: Search },
      { id: 'settings', group: 'Go to', label: SETTINGS_ITEM.label, hint: SETTINGS_ITEM.hint, to: SETTINGS_ITEM.to, icon: SETTINGS_ITEM.icon },
    )
  }
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
  else items.push({ id: 'signin', group: 'Account', label: 'Sign in', to: '/login', icon: LogIn }, { id: 'register', group: 'Account', label: 'Create an account', to: '/register', icon: UserPlus })
  return items
}
