// Pure helpers that turn an API analysis response into display text and structures.
// Nothing here invents analysis: every sentence is assembled from fields the backend returned.

export const LABEL_TEXT = {
  resembles_unreliable_sources: 'Resembles sources labelled unreliable',
  resembles_reliable_sources: 'Resembles sources labelled reliable',
}

export const LEVEL_TEXT = {
  moderate: { name: 'Moderate caution', short: 'moderate', advice: 'Read the result with care.' },
  high: { name: 'High caution', short: 'high', advice: 'Treat the result as weak evidence about the text.' },
  very_high: { name: 'Very high caution', short: 'very high', advice: 'Do not rely on this result.' },
}

export const percent = (p) => `${Math.round(p * 100)}%`

/** The sentences of the "reading": one per instrument, never merged into a verdict. */
export function buildReading(result) {
  const { classification, uncertainty, evidence } = result
  const unreliable = classification.label === 'resembles_unreliable_sources'
  const check = uncertainty.domain_check
  const related = evidence.hits.filter((h) => h.relevant)

  const style = unreliable
    ? 'The writing style resembles content from sources labelled unreliable in the training data.'
    : 'The writing style resembles content from sources labelled reliable in the training data.'
  const domain = !check?.available
    ? 'The domain check was not available for this analysis.'
    : check.in_domain
      ? 'The text resembles the kind of article the classifier was trained on.'
      : 'The text is unlike the articles the classifier was trained on, so its style reading is not meaningful here.'
  const evidenceLine = related.length
    ? `${related.length} reference passage${related.length === 1 ? ' is' : 's are'} topically related. Support or contradiction is not assessed.`
    : 'No reference passage is clearly related. The collection is small, so this says nothing about accuracy.'
  const trust = LEVEL_TEXT[uncertainty.level] ?? LEVEL_TEXT.moderate
  const outOfDomain = Boolean(check?.available && !check.in_domain)
  // Out of domain: the model still emits a label, but it must be presented as not meaningful, not as a finding.
  const styleNote = outOfDomain
    ? `The model still produced a style label (${unreliable ? 'unreliable' : 'reliable'}), but it carries no meaning for this text.`
    : null
  return { style, styleNote, domain, evidence: evidenceLine, trust, outOfDomain, relatedCount: related.length }
}

/** A readable title when none was supplied: the first sentence, trimmed. */
export function deriveTitle(text, max = 78) {
  const first = (text ?? '').trim().split(/(?<=[.!?])\s+|\n+/)[0]?.trim() ?? ''
  if (!first) return 'Untitled text'
  return first.length > max ? `${first.slice(0, max).replace(/\s+\S*$/, '')}…` : first
}

/** Plain-text summary for the clipboard. Includes the limitations so it cannot be quoted without them. */
export function buildSummaryText(result, { title } = {}) {
  const { classification, uncertainty, evidence, word_count: words, source } = result
  const lines = [
    `VERITAS analysis${title ? `: ${title}` : ''}`,
    source ? `Source: ${source.final_url}` : null,
    `Length: ${words} words`,
    '',
    `Style reading: ${LABEL_TEXT[classification.label]} (model probability for "unreliable": ${percent(classification.probability_unreliable_style)}).`,
    classification.confidence_note,
    '',
    `Trust in this analysis: ${LEVEL_TEXT[uncertainty.level]?.name ?? uncertainty.level}.`,
    ...uncertainty.reasons.map((r) => `- ${r}`),
    uncertainty.domain_check?.available ? `Domain check: ${uncertainty.domain_check.in_domain ? 'resembles training articles' : 'unlike training articles'} (similarity ${uncertainty.domain_check.similarity}, cut-off ${uncertainty.domain_check.threshold}).` : null,
    '',
    `Related reference passages (relevance only, threshold ${evidence.relevance_threshold}):`,
    ...(evidence.hits.some((h) => h.relevant)
      ? evidence.hits.filter((h) => h.relevant).map((h) => `- ${h.id} (${h.score.toFixed(2)}) ${h.source_org}: ${h.source_url}`)
      : ['- none']),
    '',
    result.disclaimer,
  ]
  return lines.filter((line) => line !== null).join('\n')
}

const normalise = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Splits a document into paragraphs and sentences, tagging each sentence with the numbers (1-based, in the order of
 * the related passages) of the evidence hits whose matched query text it contains.
 */
export function buildProof(text, hits) {
  const related = hits.filter((h) => h.relevant && h.matched_text)
  const queries = related.map((h, i) => ({ ref: i + 1, query: normalise(h.matched_text).replace(/…$/, '') }))
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      sentences: (paragraph.match(/[^.!?]+[.!?]*["')”]*\s*/g) ?? [paragraph]).map((sentence) => {
        const norm = normalise(sentence)
        const refs = queries.filter((q) => q.query.length > 12 && (norm.includes(q.query.slice(0, 120)) || q.query.includes(norm.slice(0, 120)) && norm.length > 12)).map((q) => q.ref)
        return { text: sentence, refs }
      }),
    }))
}

/** Signals worth a second look: anything non-zero except plain length measures. */
export function notableSignals(signals) {
  return signals.filter((s) => !['word_count', 'avg_sentence_length'].includes(s.key) && s.value > 0)
}
