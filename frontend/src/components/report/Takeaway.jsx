import { buildTakeaway } from './reportModel'

/** Plain-language interpretation of the three readings, assembled from the response (see buildTakeaway). */
export default function Takeaway({ result }) {
  const t = buildTakeaway(result)
  const rows = [
    ['Style', t.observed],
    ['Evidence', t.retrieved],
    ['Trust', t.trust],
  ]
  return (
    <section aria-labelledby="takeaway-title" className="panel p-6 sm:p-8">
      <h2 id="takeaway-title" className="text-[1.25rem] font-semibold tracking-[-0.02em] text-paper">
        What should I take away from this?
      </h2>
      <dl className="mt-5 space-y-4">
        {rows.map(([label, sentence]) => (
          <div key={label} className="grid gap-x-6 gap-y-1 sm:grid-cols-[6rem_1fr]">
            <dt className="t-eyebrow pt-1">{label}</dt>
            <dd className="max-w-3xl text-[0.9375rem] leading-relaxed text-steel">{sentence}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 border-t border-line pt-4 text-[1rem] font-medium leading-relaxed text-paper">{t.bottomLine}</p>
    </section>
  )
}
