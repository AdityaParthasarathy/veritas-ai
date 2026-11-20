import { useEffect, useState } from 'react'
import { percent } from './reportModel'

/**
 * One-dimensional scale for the classifier's probability. The marker settles from the midpoint to the value once,
 * on mount. Labels make clear this is a style reading, and the midpoint tick is the model's decision boundary.
 */
export default function StyleScale({ probability, dimmed = false }) {
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const position = settled ? probability * 100 : 50

  return (
    <div className={dimmed ? 'opacity-60' : ''}>
      <div className="flex justify-between text-[0.8125rem] text-steel">
        <span>Resembles reliable sources</span>
        <span className="text-right">Resembles unreliable sources</span>
      </div>
      <div
        role="meter"
        aria-label="Model probability for the unreliable-source label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(probability * 100)}
        aria-valuetext={`${percent(probability)} for the unreliable-source label`}
        className="relative mt-5 h-10"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
        {Array.from({ length: 21 }, (_, i) => (
          <span key={i} aria-hidden="true" className={`absolute top-1/2 w-px -translate-y-1/2 bg-line-strong ${i === 10 ? 'h-5 bg-dim' : i % 2 === 0 ? 'h-3' : 'h-1.5'}`} style={{ left: `${i * 5}%` }} />
        ))}
        <span
          aria-hidden="true"
          className="absolute top-0 h-full transition-[left] duration-[900ms] ease-out"
          style={{ left: `${position}%` }}
        >
          <span className="absolute left-0 top-0 h-full w-px -translate-x-1/2 bg-signal" />
          <span className="absolute -top-1 left-0 -translate-x-1/2 border-x-4 border-t-[5px] border-x-transparent border-t-signal" />
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="t-meta">decision boundary at 50%</span>
        <span className="t-data text-lg" style={{ marginLeft: 'auto' }}>
          {percent(probability)}
        </span>
      </div>
    </div>
  )
}
