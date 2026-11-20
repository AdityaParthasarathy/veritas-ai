import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'
import { setToken } from '../services/tokenStore'

expect.extend(axeMatchers)

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  setToken(null)
})
