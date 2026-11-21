import { describe, expect, it } from 'vitest'
import { analysisResult } from '../../test/fixtures'
import { buildFullReportText, buildPrimary, buildProof, buildReading, buildSummaryText, buildTakeaway, notableSignals } from './reportModel'

const withHits = (hits) => ({ ...analysisResult, evidence: { ...analysisResult.evidence, hits } })

describe('buildReading', () => {
  it('describes style, domain, evidence and trust separately and never gives a verdict', () => {
    const reading = buildReading(analysisResult)
    expect(reading.style).toMatch(/resembles content from sources labelled reliable/)
    expect(reading.domain).toMatch(/resembles the kind of article/)
    expect(reading.evidence).toMatch(/1 reference passage is topically related.*not assessed/)
    expect(reading.trust.name).toBe('Moderate caution')
    const prose = [reading.style, reading.domain, reading.evidence, reading.trust.name, reading.trust.advice].join(' ').toLowerCase()
    expect(prose).not.toMatch(/\b(is true|is false|fake|verified|debunked|proves?)\b/)
  })

  it('says the style reading is not meaningful when the text is out of domain', () => {
    const result = { ...analysisResult, uncertainty: { ...analysisResult.uncertainty, level: 'very_high', domain_check: { available: true, in_domain: false, similarity: 0.04, threshold: 0.06 } } }
    const reading = buildReading(result)
    expect(reading.outOfDomain).toBe(true)
    expect(reading.domain).toMatch(/not meaningful/)
    expect(reading.trust.advice).toMatch(/Do not rely/)
  })

  it('reports no related evidence honestly', () => {
    const reading = buildReading(withHits([{ ...analysisResult.evidence.hits[0], relevant: false }]))
    expect(reading.evidence).toMatch(/No reference passage is clearly related.*says nothing about accuracy/)
    expect(reading.relatedCount).toBe(0)
  })

  it('copes with results saved before the domain check existed', () => {
    const legacy = structuredClone(analysisResult)
    delete legacy.uncertainty.domain_check
    expect(buildReading(legacy).domain).toMatch(/not available/)
  })
})

describe('buildSummaryText', () => {
  it('always carries the confidence note and the non-verification disclaimer', () => {
    const text = buildSummaryText(analysisResult, { title: 'Test' })
    expect(text).toMatch(/not the probability that the content is true or false/)
    expect(text).toMatch(/does not verify that any claim is true or false/)
    expect(text).toMatch(/health|climate-co2/)
    expect(text).toMatch(/Trust in this analysis: Moderate caution/)
  })
})

describe('buildProof', () => {
  const text = 'NASA scientists reported record warming. Carbon dioxide concentrations measured at Mauna Loa remain far above pre-industrial levels. Sea level is also rising.\n\nA second paragraph follows.'

  it('splits paragraphs and marks only the sentence that was used as a query', () => {
    const proof = buildProof(text, analysisResult.evidence.hits)
    expect(proof).toHaveLength(2)
    const marked = proof[0].sentences.filter((s) => s.refs.length)
    expect(marked).toHaveLength(1)
    expect(marked[0].text).toMatch(/Mauna Loa/)
    expect(marked[0].refs).toEqual([1])
  })

  it('marks nothing for hits below the relevance threshold', () => {
    const hits = [{ ...analysisResult.evidence.hits[0], relevant: false }]
    expect(buildProof(text, hits).flatMap((p) => p.sentences).some((s) => s.refs.length)).toBe(false)
  })

  it('ignores title-only matches that are not in the text', () => {
    const hits = [{ ...analysisResult.evidence.hits[0], matched_text: 'A headline that is not in the body at all' }]
    expect(buildProof(text, hits).flatMap((p) => p.sentences).some((s) => s.refs.length)).toBe(false)
  })
})

describe('notableSignals', () => {
  it('skips length measures and zero values', () => {
    const signals = [
      { key: 'word_count', value: 100 },
      { key: 'exclamation_marks', value: 0 },
      { key: 'all_caps_ratio', value: 0.1 },
    ]
    expect(notableSignals(signals).map((s) => s.key)).toEqual(['all_caps_ratio'])
  })
})

describe('buildPrimary and buildTakeaway', () => {
  const base = analysisResult
  const reliable = { ...base.classification, label: 'resembles_reliable_sources', probability_unreliable_style: 0.12 }
  const noHits = { ...base.evidence, hits: [] }

  it('states the style reading and says the probability is not a probability of being fake', () => {
    const primary = buildPrimary({ ...base, classification: reliable })
    expect(primary.headline).toBe('Writing style resembles examples labelled reliable.')
    expect(primary.measurement).toBe('Model probability for the unreliable label: 12%')
    expect(primary.note).toMatch(/not a 12% probability that the article is fake/)
  })

  it('reliable-like with no related passage: the system has not checked the claims', () => {
    const t = buildTakeaway({ ...base, classification: reliable, evidence: noHits })
    expect(t.observed).toMatch(/reliable-labelled training examples.*does not mean the claims are true/)
    expect(t.retrieved).toMatch(/No clearly related passage.*coverage, not the accuracy/)
    expect(t.bottomLine).toBe("This means the system has not independently checked the article's claims.")
  })

  it('related passages are related material, never confirmation', () => {
    const t = buildTakeaway({ ...base, classification: reliable })
    expect(t.retrieved).toMatch(/1 reference passage from NOAA is close in meaning.*not confirmation/)
    expect(t.bottomLine).toMatch(/Compare them with the linked sources yourself/)
  })

  it('unreliable-like describes style and does not call the claims false', () => {
    const t = buildTakeaway({ ...base, classification: { ...base.classification, label: 'resembles_unreliable_sources', probability_unreliable_style: 0.93 } })
    expect(t.observed).toMatch(/unreliable-labelled.*does not mean the claims are false/)
  })

  it('out of domain: the label carries no meaning', () => {
    const result = { ...base, uncertainty: { ...base.uncertainty, level: 'very_high', domain_check: { available: true, in_domain: false, similarity: 0.03, threshold: 0.06 } } }
    expect(buildPrimary(result).headline).toMatch(/not meaningful/)
    expect(buildTakeaway(result).observed).toMatch(/carries no meaning here/)
  })

  it('raised caution quotes the first reason from the response', () => {
    const t = buildTakeaway({ ...base, uncertainty: { ...base.uncertainty, level: 'high', reasons: ['The text is very short (9 words).'] } })
    expect(t.trust).toMatch(/Caution is high: The text is very short \(9 words\)\./)
  })

  it('the full report text contains every passage and the caveats', () => {
    const text = buildFullReportText(base, { title: 'T', text: 'Body.' })
    expect(text).toMatch(/Full report/)
    expect(text).toMatch(/NOAA/)
    expect(text).toMatch(/Standing caveats/)
    expect(text).toMatch(/Body\./)
  })
})
