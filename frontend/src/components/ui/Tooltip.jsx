import { cloneElement, useEffect, useId, useState } from 'react'

/**
 * Accessible tooltip for one child element. Opens on hover (after a short delay) and on keyboard focus,
 * closes on blur, pointer leave and Escape. The text is exposed through aria-describedby.
 */
export default function Tooltip({ text, children, side = 'top', delay = 350 }) {
  const id = useId()
  const [hovering, setHovering] = useState(false)
  const [waited, setWaited] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!hovering) return undefined
    const timer = setTimeout(() => setWaited(true), delay)
    return () => {
      clearTimeout(timer)
      setWaited(false)
    }
  }, [hovering, delay])

  const open = !dismissed && (focused || (hovering && waited))

  const child = cloneElement(children, {
    'aria-describedby': open ? id : children.props['aria-describedby'],
    onPointerEnter: () => {
      setDismissed(false)
      setHovering(true)
    },
    onPointerLeave: () => setHovering(false),
    onFocus: () => {
      setDismissed(false)
      setFocused(true)
    },
    onBlur: () => setFocused(false),
    onKeyDown: (event) => {
      if (event.key === 'Escape') setDismissed(true)
      children.props.onKeyDown?.(event)
    },
  })

  return (
    <span className="relative inline-flex">
      {child}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`animate-fade-in pointer-events-none absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-md border border-line-strong bg-ink-3 px-2.5 py-1.5 text-left text-xs leading-snug text-paper shadow-float ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
