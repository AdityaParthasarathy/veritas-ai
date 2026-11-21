import { TriangleAlert } from 'lucide-react'
import { buildWarnings } from './reportModel'

/**
 * "Read this first": every reason the classifier reading may not mean what it looks like (page is not an article,
 * text outside the training domain, very short input, an undecided model). Shown above the result, not beneath it.
 * Renders nothing when there is nothing to warn about.
 */
export default function ResultWarnings({ result }) {
  const warnings = buildWarnings(result)
  if (warnings.length === 0) return null
  return (
    <section aria-labelledby="warnings-title" className="rounded-xl border border-caution/50 bg-caution/10 p-5 sm:p-6">
      <h2 id="warnings-title" className="flex items-center gap-2.5 text-[1rem] font-semibold text-paper">
        <TriangleAlert className="h-5 w-5 shrink-0 text-caution" aria-hidden="true" />
        Read this before the result
      </h2>
      <ul className="mt-3 space-y-3">
        {warnings.map((warning) => (
          <li key={warning.id} data-warning={warning.id} className="border-l-2 border-caution/60 pl-4">
            <p className="text-[0.9375rem] font-medium text-paper">{warning.title}</p>
            <p className="mt-0.5 text-[0.875rem] leading-relaxed text-steel">{warning.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
