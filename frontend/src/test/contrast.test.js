import { describe, expect, it } from 'vitest'
import { colors } from '../design/tokens'

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('design tokens meet WCAG AA (4.5:1 for normal text)', () => {
  const grounds = { 'ink-0': colors.ink[0], 'ink-1': colors.ink[1], 'ink-2': colors.ink[2], 'ink-3': colors.ink[3] }
  const text = { paper: colors.paper, steel: colors.steel, dim: colors.dim, violet: colors.violet, signal: colors.signal.DEFAULT, 'signal-strong': colors.signal.strong, caution: colors.caution, support: colors.support, contra: colors.contra }

  for (const [groundName, ground] of Object.entries(grounds)) {
    for (const [name, value] of Object.entries(text)) {
      it(`${name} on ${groundName}`, () => {
        expect(ratio(value, ground)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  it('white text on the primary button gradient (both ends)', () => {
    expect(ratio('#FFFFFF', '#6847F0')).toBeGreaterThanOrEqual(4.5)
    expect(ratio('#FFFFFF', '#7A58F7')).toBeGreaterThanOrEqual(4.5)
    expect(ratio('#FFFFFF', colors.brand.DEFAULT)).toBeGreaterThanOrEqual(4.5)
  })

  it('dark text on filled controls (skip link, danger hover)', () => {
    expect(ratio(colors.ink[0], colors.signal.DEFAULT)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(colors.ink[0], colors.signal.strong)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(colors.ink[0], colors.contra)).toBeGreaterThanOrEqual(4.5)
  })

  it('component borders that must stay perceivable reach 1.5:1 against the page', () => {
    expect(ratio(colors.line.strong, colors.ink[0])).toBeGreaterThanOrEqual(1.5)
  })
})
