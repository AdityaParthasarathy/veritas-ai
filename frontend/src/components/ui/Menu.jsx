import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Dropdown menu. The trigger is any button content; items are { label, icon, to, onSelect, danger }.
 * Keyboard: Enter/Space/ArrowDown open, arrows and Home/End move, Escape closes and returns focus, Tab closes.
 */
export default function Menu({ label, trigger, items, align = 'right', triggerClassName = '' }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const buttonRef = useRef(null)
  const listRef = useRef(null)

  const close = (restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return undefined
    listRef.current?.querySelectorAll('[role="menuitem"]')[active]?.focus()
    const onPointerDown = (event) => {
      if (!listRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, active])

  const onButtonKey = (event) => {
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      setActive(event.key === 'ArrowUp' ? items.length - 1 : 0)
      setOpen(true)
    }
  }
  const onListKey = (event) => {
    const last = items.length - 1
    const moves = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last }
    if (event.key in moves) {
      event.preventDefault()
      setActive(moves[event.key])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        onClick={() => {
          setActive(0)
          setOpen((value) => !value)
        }}
        onKeyDown={onButtonKey}
        className={`press ${triggerClassName}`}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={listRef}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onListKey}
          className={`animate-sheet-in absolute top-full z-50 mt-2 min-w-48 origin-top rounded-lg border border-line-strong bg-ink-2 p-1 shadow-float ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {items.map((item, index) => {
            const classes = `flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast ${item.danger ? 'text-contra hover:bg-contra/10' : 'text-steel hover:bg-ink-3 hover:text-paper'} focus:bg-ink-3 focus:text-paper focus:outline-none`
            const select = () => {
              close()
              item.onSelect?.()
            }
            return item.to ? (
              <Link key={item.label} role="menuitem" tabIndex={index === active ? 0 : -1} to={item.to} onClick={() => setOpen(false)} className={classes}>
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button key={item.label} type="button" role="menuitem" tabIndex={index === active ? 0 : -1} onClick={select} className={classes}>
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
