import { describe, expect, it } from 'vitest'
import config from '../../tailwind.config.js'

const colors = config.theme.extend.colors.veritas

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('design tokens meet WCAG AA (4.5:1 for normal text)', () => {
  const backgrounds = { bg: colors.bg, secondary: colors.secondary, card: colors.card }
  const textTokens = ['text', 'muted', 'dim', 'primary', 'cyan', 'success', 'warning', 'error']

  for (const [bgName, bg] of Object.entries(backgrounds)) {
    for (const token of textTokens) {
      it(`${token} on ${bgName}`, () => {
        expect(ratio(colors[token], bg)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  it('white text on primary buttons', () => {
    expect(ratio('#FFFFFF', colors['primary-solid'])).toBeGreaterThanOrEqual(4.5)
    expect(ratio('#FFFFFF', colors['primary-solid-hover'])).toBeGreaterThanOrEqual(4.5)
  })
})
