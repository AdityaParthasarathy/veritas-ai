import { LEVEL_TEXT } from './reportModel'

const STEPS = ['moderate', 'high', 'very_high']
const FILL = { moderate: 'bg-caution/70', high: 'bg-caution', very_high: 'bg-contra' }

/** Three steps of caution about the analysis itself. The lowest step is "moderate": the system never reports low. */
export default function TrustLadder({ level }) {
  const index = Math.max(0, STEPS.indexOf(level))
  const info = LEVEL_TEXT[level] ?? LEVEL_TEXT.moderate
  return (
    <div>
      <div role="img" aria-label={`Caution level ${index + 1} of 3: ${info.name}`} className="flex h-14 items-end gap-1.5">
        {STEPS.map((step, i) => (
          <span key={step} aria-hidden="true" className={`w-7 rounded-sm transition-[background-color,transform] duration-slow ease-out ${i <= index ? FILL[level] : 'bg-line'}`} style={{ height: `${36 + i * 32}%`, transformOrigin: 'bottom', transitionDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <p className="mt-3 text-[0.9375rem] font-medium text-paper">{info.name}</p>
      <p className="t-caption">{info.advice}</p>
    </div>
  )
}
