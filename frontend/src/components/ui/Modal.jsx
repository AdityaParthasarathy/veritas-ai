import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal dialog: dimmed backdrop, scale-and-fade entrance, focus moved in on open, focus trapped while open,
 * Escape and backdrop click dismiss, focus returned to the opener on close, page scroll locked.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', initialFocusRef }) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef(null)
  const openerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    openerRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? panelRef.current?.querySelector(FOCUSABLE) ?? panelRef.current
      target?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      openerRef.current?.focus?.()
    }
  }, [open, initialFocusRef])

  // Escape closes the dialog wherever focus currently is.
  useEffect(() => {
    if (!open) return undefined
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [open, onClose])

  if (!open) return null

  const onKeyDown = (event) => {
    if (event.key !== 'Tab') return
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center" onKeyDown={onKeyDown}>
      <div className="animate-fade-in absolute inset-0 bg-ink-0/80" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`animate-sheet-in relative w-full rounded-xl border border-line-strong bg-ink-2 shadow-float ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="t-h2">
              {title}
            </h2>
            {description && (
              <p id={descId} className="t-caption mt-1">
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="press -mr-1.5 -mt-1 rounded-md p-2 text-dim hover:bg-ink-3 hover:text-paper">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
