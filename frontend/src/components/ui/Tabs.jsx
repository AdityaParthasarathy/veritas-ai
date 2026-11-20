import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Tab list with a sliding indicator. Controlled (`value`, `onChange`); arrow keys, Home and End move selection.
 * Panels are rendered by the caller with role="tabpanel" and aria-labelledby={`${idPrefix}-tab-${id}`}.
 */
export default function Tabs({ tabs, value, onChange, label, idPrefix = 'tabs', className = '' }) {
  const listRef = useRef(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const measure = () => {
      const active = listRef.current?.querySelector('[aria-selected="true"]')
      if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth, ready: true })
    }
    measure()
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [value, tabs])

  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === value)
    const last = tabs.length - 1
    const next = { ArrowRight: Math.min(index + 1, last), ArrowLeft: Math.max(index - 1, 0), Home: 0, End: last }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onChange(tabs[next].id)
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus()
  }

  return (
    <div ref={listRef} role="tablist" aria-label={label} onKeyDown={onKeyDown} className={`relative flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            id={`${idPrefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`press relative -mb-px whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors duration-fast ${selected ? 'text-paper' : 'text-dim hover:text-steel'}`}
          >
            {tab.label}
            {tab.count != null && <span className="t-meta ml-2">{tab.count}</span>}
          </button>
        )
      })}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 h-px bg-signal transition-[transform,width] duration-slow ease-out"
        style={{ width: indicator.width, transform: `translateX(${indicator.left}px)`, opacity: indicator.ready ? 1 : 0 }}
      />
    </div>
  )
}
