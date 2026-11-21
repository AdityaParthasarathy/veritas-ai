import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

beforeAll(() => {
  // jsdom has no canvas: the decorative signal field simply does not draw.
  HTMLCanvasElement.prototype.getContext = () => null
  window.scrollTo = () => {}
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
