import { Info } from 'lucide-react'
import Tooltip from '../ui/Tooltip'

/** Descriptive linguistic measurements. They are not used by the classifier and say nothing about truth. */
export default function SignalsTable({ signals }) {
  return (
    <dl className="grid gap-x-10 md:grid-cols-2">
      {signals.map((signal) => (
        <div key={signal.key} className="flex items-baseline justify-between gap-4 border-t border-line py-2.5">
          <dt className="flex items-center gap-1.5 text-[0.875rem] text-steel">
            {signal.label}
            <Tooltip text={signal.description}>
              <button type="button" aria-label={`What “${signal.label}” measures`} className="rounded p-0.5 text-dim hover:text-paper">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
          </dt>
          <dd className={`text-right ${signal.value > 0 ? 't-data' : 't-meta'}`}>
            {signal.value}
            <span className="t-meta ml-1.5 font-sans">{signal.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
