import { useCallback, useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useInView } from '../../hooks/useInView'
import { useReducedMotion } from '../../hooks/useReducedMotion'

// Each line pairs a reflex (struck) with the question that replaces it. These are statements of method, not claims
// about any article, so nothing here needs a source.
const LINES = [
  { lead: 'Every headline deserves to be', struck: 'believed', swap: 'questioned' },
  { lead: 'Every viral claim deserves', struck: 'a share', swap: 'scrutiny' },
  { lead: 'Every source deserves', struck: 'blind trust', swap: 'evidence' },
  { lead: 'Every confident answer deserves', struck: 'applause', swap: 'a second look' },
]
const STEP = 1100 // ms between lines
const STRIKE_AT = 650 // ms after a line begins before its strike draws
const SWAP_AT = 1250 // ms after a line begins before the replacement arrives

/**
 * The strike-through story. Lines are laid out first; once the block scrolls into view each line plays in turn:
 * the reflex word is struck by a line that draws left to right, dims, and the replacement rises in beside it.
 * Semantics: <del> for the struck word and <ins> for its replacement, so the meaning survives without the motion.
 * Reduced motion: the final state is shown at once. The Replay button re-runs the sequence.
 */
export default function StrikeStory() {
  const [ref, inView] = useInView({ rootMargin: '0px 0px -20% 0px' })
  const reduced = useReducedMotion()
  const [on, setOn] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (inView || reduced) setOn(true)
  }, [inView, reduced])

  const replay = useCallback(() => {
    setOn(false)
    setTimeout(() => setOn(true), 80)
  }, [])

  return (
    <div ref={ref}>
      <ul className="space-y-5 sm:space-y-6">
        {LINES.map((line, i) => {
          const base = i * STEP
          return (
            <li key={line.lead} className="font-display text-[clamp(1.5rem,3.6vw,2.9rem)] font-semibold leading-[1.18] tracking-[-0.03em] text-paper">
              <span>{line.lead} </span>
              <del className="relative inline-block no-underline">
                <span className="transition-colors ease-out" style={{ color: on ? 'var(--c-dim)' : 'var(--c-paper)', transitionDuration: '600ms', transitionDelay: on ? `${base + STRIKE_AT}ms` : '0ms' }}>
                  {line.struck}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute left-[-2%] top-[56%] h-[3px] w-[104%] origin-left rounded-full bg-gradient-to-r from-contra to-violet"
                  style={{ transform: on ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 520ms var(--ease-out) ${on ? base + STRIKE_AT : 0}ms` }}
                />
              </del>
              <ins
                className="t-accent text-gradient ml-[0.28em] inline-block pr-1 text-[1.12em] font-normal no-underline"
                style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(0.35em)', transition: `opacity 700ms var(--ease-out) ${on ? base + SWAP_AT : 0}ms, transform 700ms var(--ease-out) ${on ? base + SWAP_AT : 0}ms` }}
              >
                {line.swap}
              </ins>
              <span>.</span>
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={replay} className="press t-meta mt-8 inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 hover:border-violet hover:text-paper">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Replay
      </button>
    </div>
  )
}
