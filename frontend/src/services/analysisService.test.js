import { describe, expect, it } from 'vitest'
import { describeError } from './analysisService'

const httpError = (status, error) => ({ response: { status, data: error ? { error } : {} } })

describe('describeError', () => {
  it('reports an unreachable backend', () => {
    expect(describeError({})).toMatch(/Cannot reach the backend/)
  })

  it('reports timeouts', () => {
    expect(describeError({ code: 'ECONNABORTED' })).toMatch(/too long/)
  })

  it('shows our own safe server messages for URL and rate-limit errors', () => {
    expect(describeError(httpError(422, { code: 'URL_BLOCKED', message: 'This URL points to a private address.' }))).toBe('This URL points to a private address.')
    expect(describeError(httpError(422, { code: 'EXTRACTION_FAILED', message: 'Could not extract article text.' }))).toBe('Could not extract article text.')
    expect(describeError(httpError(429, { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again later.' }))).toMatch(/Too many/)
  })

  it('never exposes unknown server messages', () => {
    expect(describeError(httpError(500, { code: 'INTERNAL_SERVER_ERROR', message: 'SELECT * FROM secrets' }))).toBe('The server could not complete the request.')
  })

  it('formats validation errors, 404, 413 and 503', () => {
    expect(describeError(httpError(422, { code: 'VALIDATION_ERROR', details: [{ message: 'text too short' }] }))).toBe('Invalid input: text too short')
    expect(describeError(httpError(404))).toMatch(/not found/)
    expect(describeError(httpError(413))).toMatch(/too large/)
    expect(describeError(httpError(503))).toMatch(/not available/)
  })
})
