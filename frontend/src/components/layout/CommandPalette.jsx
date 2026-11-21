import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Search } from 'lucide-react'
import Kbd from '../ui/Kbd'
import { buildCommands } from './commands'

/** Command palette: type to filter, arrows to move, Enter to run, Escape to close. */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const openerRef = useRef(null)
  const listId = useId()

  const commands = useMemo(() => buildCommands(), [])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? commands.filter((c) => `${c.label} ${c.hint ?? ''} ${c.group}`.toLowerCase().includes(q)) : commands
  }, [commands, query])

  useEffect(() => {
    if (!open) return undefined
    openerRef.current = document.activeElement
    inputRef.current?.focus()
    return () => openerRef.current?.focus?.()
  }, [open])

  if (!open) return null

  const close = () => {
    setQuery('')
    setActive(0)
    onClose()
  }
  const run = (command) => {
    if (!command) return
    close()
    navigate(command.to, command.state ? { state: command.state } : undefined)
  }
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      run(results[active])
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-start justify-center px-4 pt-[12vh]">
      <div className="animate-fade-in absolute inset-0 bg-ink-0/80" onClick={close} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKeyDown} className="animate-sheet-in relative w-full max-w-xl overflow-hidden rounded-xl border border-line-strong bg-ink-2 shadow-float">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-dim" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            aria-label="Search destinations and actions"
            placeholder="Go to a page, or load a demo input"
            className="h-12 w-full bg-transparent text-[0.9375rem] text-paper outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-dim">Nothing matches “{query}”.</li>}
          {results.map((command, index) => {
            const showGroup = index === 0 || results[index - 1].group !== command.group
            const Icon = command.icon
            return (
              <li key={command.id} role="presentation">
                {showGroup && <p className="t-caption px-3 pb-1 pt-3">{command.group}</p>}
                <div
                  id={`${listId}-${command.id}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(command)}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm ${index === active ? 'bg-ink-3 text-paper' : 'text-steel'}`}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0 text-dim" aria-hidden="true" /> : <span className="h-4 w-4 shrink-0" />}
                  <span className="flex-1 truncate">{command.label}</span>
                  {command.hint && <span className="t-caption hidden truncate sm:inline">{command.hint}</span>}
                  {index === active && <CornerDownLeft className="h-3.5 w-3.5 text-dim" aria-hidden="true" />}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
