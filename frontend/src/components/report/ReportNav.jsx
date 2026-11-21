import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'writing-style', label: 'Writing style' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'trust', label: 'Trust assessment' },
  { id: 'method', label: 'Method and limitations' },
]

/**
 * Section navigator. A vertical rail on large screens, a horizontal strip under the top bar on small ones.
 * The active section follows the scroll position; selecting one scrolls smoothly (instantly with reduced motion).
 */
export default function ReportNav() {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const visible = new Map()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting)
        const current = [...SECTIONS].reverse().find((s) => visible.get(s.id))
        if (current) setActive(current.id)
      },
      { rootMargin: '-25% 0px -60% 0px' },
    )
    for (const section of SECTIONS) {
      const node = document.getElementById(section.id)
      if (node) observer.observe(node)
    }
    return () => observer.disconnect()
  }, [])

  const go = (event, id) => {
    event.preventDefault()
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setActive(id)
  }

  return (
    <nav aria-label="Report sections" className="no-print sticky top-16 z-30 -mx-4 overflow-x-auto border-b border-line bg-ink-0/85 px-4 py-2 backdrop-blur-md sm:-mx-8 sm:px-8 lg:top-24 lg:z-10 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      <p className="t-eyebrow mb-3 hidden lg:block">In this report</p>
      <ul className="flex gap-1 lg:flex-col">
        {SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              onClick={(event) => go(event, section.id)}
              aria-current={active === section.id ? 'location' : undefined}
              className={`press block whitespace-nowrap rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors duration-fast lg:border-l-2 lg:rounded-l-none lg:py-1 ${active === section.id ? 'bg-brand/20 text-paper lg:border-violet lg:bg-transparent' : 'text-dim hover:text-steel lg:border-transparent'}`}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
