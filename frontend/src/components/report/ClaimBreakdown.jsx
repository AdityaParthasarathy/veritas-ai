import { buildProof } from './reportModel'

/**
 * Claim breakdown. The backend does not extract claims or verify them, so this section says so and shows what it does
 * have: the sentences of the submitted text that matched a reference passage. Pass `claims` (an array of
 * { text, status, evidence }) when a claim-level capability exists; it is rendered as given, never inferred.
 */
export default function ClaimBreakdown({ text, hits, claims = null }) {
  if (claims?.length) {
    return (
      <ol className="space-y-3">
        {claims.map((claim, i) => (
          <li key={i} className="panel p-4 text-[0.9375rem] text-paper">
            {claim.text}
          </li>
        ))}
      </ol>
    )
  }
  const matched = text
    ? buildProof(text, hits)
        .flatMap((p) => p.sentences)
        .filter((s) => s.refs.length > 0)
    : []
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="panel border-dashed p-5 lg:col-span-5">
        <p className="text-sm font-semibold text-paper">Claim-level verification is not available</p>
        <p className="t-body mt-2 text-[0.875rem]">
          VERITAS does not extract individual claims or rule on them. A claim in this text can be false even when the writing looks reliable, and true even when it looks unreliable. Check important claims against the cited sources or a fact-checker.
        </p>
        <ul className="mt-4 space-y-1.5 text-[0.8125rem]">
          {['Claim extraction', 'Per-claim verdicts', 'Supporting / contradicting labels'].map((item) => (
            <li key={item} className="flex items-center justify-between border-t border-line pt-1.5 text-steel">
              {item}
              <span className="t-meta">not performed</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-7">
        <p className="text-sm font-semibold text-paper">What is available: sentences that matched a reference passage</p>
        {matched.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {matched.map((sentence, i) => (
              <li key={i} className="flex gap-3 rounded-md border border-line bg-ink-1/60 px-4 py-3 text-[0.9375rem] leading-relaxed text-paper">
                <span className="mt-0.5 shrink-0 font-mono text-[0.75rem] text-violet">{sentence.refs.map((r) => `[${r}]`).join(' ')}</span>
                <span>{sentence.text.trim()}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="t-body mt-3 text-[0.9375rem]">
            {text ? 'No sentence in the submitted text matched a reference passage closely enough to be marked.' : 'The text of an analysed web page is not returned by the API, so matched sentences cannot be shown.'}
          </p>
        )}
        <p className="t-caption mt-3">A match means the sentence is close in meaning to a passage. It does not mean the sentence is verified.</p>
      </div>
    </div>
  )
}
