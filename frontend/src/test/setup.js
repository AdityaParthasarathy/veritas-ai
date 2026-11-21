import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null
  window.scrollTo = () => {}
})

afterEach(() => {
  cleanup()
})
