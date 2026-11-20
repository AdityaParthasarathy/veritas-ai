import { buildProof } from './reportModel'

/**
 * The submitted text set as a galley proof. Sentences that were used as retrieval queries carry a numbered margin tag
 * and a cyan rule; hovering a tag or an evidence item links the two. Only real matches (from the API) are marked.
 */
export default function DocumentProof({ text, hits, activeRef, onActivate }) {
  const paragraphs = buildProof(text, hits)
  const anyMarked = paragraphs.some((p) => p.sentences.some((s) => s.refs.length))
  return (
    <div>
      <div className="max-h-[34rem] overflow-y-auto pr-4" tabIndex={0} aria-label="Submitted text with matched sentences marked">
        {paragraphs.map((paragraph, pi) => (
          <p key={pi} className="t-galley mb-5 last:mb-0">
            {paragraph.sentences.map((sentence, si) => {
              if (!sentence.refs.length) return <span key={si}>{sentence.text}</span>
              const active = sentence.refs.includes(activeRef)
              return (
                <span
                  key={si}
                  onPointerEnter={() => onActivate?.(sentence.refs[0])}
                  onPointerLeave={() => onActivate?.(null)}
                  className={`rounded-sm border-b transition-colors duration-base ease-out ${active ? 'border-signal bg-signal/15' : 'border-signal/50 bg-signal/[0.06]'}`}
                >
                  {sentence.text}
                  <sup className="ml-0.5 mr-1 font-mono text-[0.6875rem] text-signal">[{sentence.refs.join(',')}]</sup>
                </span>
              )
            })}
          </p>
        ))}
      </div>
      <p className="t-caption mt-3">
        {anyMarked ? 'Marked sentences were used to find a related reference passage. The mark means “matched”, not “verified”.' : 'No sentence produced a related reference passage.'}
      </p>
    </div>
  )
}
