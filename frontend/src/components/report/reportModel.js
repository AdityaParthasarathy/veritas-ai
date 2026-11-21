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
  const notArticle = Boolean(result.source?.extraction_warning)
  // Out of domain, or not an article at all: the model still emits a label, but it must be presented as not meaningful,
  // not as a finding. The probability itself is never altered.
  const notMeaningful = outOfDomain || notArticle
  const styleNote = notMeaningful
    ? `The model still produced a style label (${unreliable ? 'unreliable' : 'reliable'}), but it carries no meaning for this text.`
    : null
  return { style, styleNote, domain, evidence: evidenceLine, trust, outOfDomain, notArticle, notMeaningful, relatedCount: related.length }
}

/**
 * Things to read before the result: each one is a reason the classifier reading may not mean what it appears to.
 * Assembled only from fields the API returned. Never contains a verdict about the text.
 */
export function buildWarnings(result) {
  const reading = buildReading(result)
  const { classification, word_count: words, source } = result
  const p = classification.probability_unreliable_style
  const warnings = []
  if (reading.notArticle) {
    warnings.push({
      id: 'not-an-article',
      title: 'This page does not look like a single article',
      body: source.extraction_warning,
    })
  }
  if (reading.outOfDomain) {
    warnings.push({
      id: 'out-of-domain',
      title: 'This text is unlike the articles the classifier was trained on',
      body: 'Its vocabulary and style are far from the training articles, so the style reading is not meaningful here, however confident it looks.',
    })
  }
  if (words < 50) {
    warnings.push({
      id: 'very-short',
      title: `Very short input (${words} words)`,
      body: 'The classifier was trained on full articles. A headline or a few sentences is far outside that range, so the reading is unreliable.',
    })
  } else if (words < 150) {
    warnings.push({
      id: 'short',
      title: `Shorter than most training articles (${words} words)`,
      body: 'Short texts give less stable readings. Treat the result as weak.',
    })
  }
  if (Math.abs(p - 0.5) < 0.15) {
    warnings.push({
      id: 'undecided',
      title: 'The classifier is close to undecided',
      body: `A probability near 50% (${percent(p)}) means the writing matches neither label strongly. Do not read it as a lean in either direction.`,
    })
  }
  return warnings
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

/** The primary explanation: what the classifier observed, with the probability presented as a measurement of style. */
export function buildPrimary(result) {
  const { classification } = result
  const reading = buildReading(result)
  const p = classification.probability_unreliable_style
  const unreliable = classification.label === 'resembles_unreliable_sources'
  return {
    outOfDomain: reading.outOfDomain,
    notMeaningful: reading.notMeaningful,
    headline: reading.notMeaningful
      ? 'The writing-style reading is not meaningful for this text.'
      : unreliable
        ? 'Writing style resembles examples labelled unreliable.'
        : 'Writing style resembles examples labelled reliable.',
    measurement: `Model probability for the unreliable label: ${percent(p)}`,
    note: `This measures similarity to patterns in the training labels. It is not a ${percent(p)} probability that the article is fake.`,
    styleNote: reading.styleNote,
  }
}

const joinOrgs = (names) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

/**
 * "What should I take away from this?" Three plain-language sentences, one per reading, assembled from the response,
 * followed by a bottom line that is always true: the system has not checked the claims.
 */
export function buildTakeaway(result) {
  const { classification, uncertainty, evidence } = result
  const reading = buildReading(result)
  const unreliable = classification.label === 'resembles_unreliable_sources'
  const related = evidence.hits.filter((h) => h.relevant)
  const orgs = [...new Set(related.map((h) => h.source_org))]

  const observed = reading.notArticle
    ? 'The fetched page looks like a menu, feed or index page rather than one article, so the style label the classifier produced carries no meaning here. Its probability reflects interface wording as much as writing style.'
    : reading.outOfDomain
      ? 'The text is unlike the news articles the classifier was trained on, so the style label it produced carries no meaning here.'
      : unreliable
      ? 'The classifier found writing patterns associated with unreliable-labelled training examples. That describes style, such as emphasis and wording habits. It does not mean the claims are false.'
      : 'The classifier found writing patterns associated with reliable-labelled training examples. That describes style. It does not mean the claims are true.'

  const retrieved =
    related.length === 0
      ? `No clearly related passage was found in the reference collection (${evidence.collection_size} passages). The collection is small, so this reflects its coverage, not the accuracy of the text.`
      : `${related.length} reference passage${related.length === 1 ? '' : 's'} from ${joinOrgs(orgs)} ${related.length === 1 ? 'is' : 'are'} close in meaning to the text. That is related material, not confirmation: the system does not judge whether a passage supports or contradicts the text.`

  const level = uncertainty.level
  const reason = uncertainty.reasons[0] ? uncertainty.reasons[0].replace(/\.$/, '') : null
  const trust =
    level === 'moderate'
      ? 'Trust in this analysis is moderate. That is the lowest level of caution the system reports, so read the result with care.'
      : `Caution is ${LEVEL_TEXT[level]?.short ?? level}${reason ? `: ${reason}` : ''}. ${LEVEL_TEXT[level]?.advice ?? ''}`.trim()

  const bottomLine =
    related.length === 0
      ? "This means the system has not independently checked the article's claims."
      : "This means the system has not independently checked the article's claims. Compare them with the linked sources yourself."
  return { observed, retrieved, trust, bottomLine }
}

/** The long clipboard text: the summary, then every retrieved passage and measurement. */
export function buildFullReportText(result, { title, text } = {}) {
  const { classification, evidence, linguistic_signals: signals, uncertainty } = result
  const lines = [
    buildSummaryText(result, { title }),
    '',
    '--- Full report ---',
    `Classifier: ${classification.model.name} (trained on ${classification.model.trained_on})`,
    `Reference collection: ${evidence.collection_name}, ${evidence.collection_size} passages, relevance cut-off ${evidence.relevance_threshold}`,
    '',
    'All retrieved passages (similarity only; support or contradiction is not assessed):',
    ...(evidence.hits.length ? evidence.hits.map((h) => `- [${h.relevant ? 'related' : 'below cut-off'}] ${h.score.toFixed(2)} ${h.source_org}: ${h.source_title} <${h.source_url}>\n  ${h.passage}`) : ['- none']),
    '',
    'Linguistic indicators (descriptive counts):',
    ...signals.map((s) => `- ${s.label}: ${s.value} ${s.unit}`),
    '',
    'Standing caveats:',
    ...uncertainty.standing_caveats.map((c) => `- ${c}`),
    `- ${classification.disclaimer}`,
    text ? `\nSubmitted text:\n${text}` : null,
  ]
  return lines.filter((l) => l !== null).join('\n')
}
