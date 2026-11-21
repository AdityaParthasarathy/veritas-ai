import { apiClient } from './api'

// Model loading on the first request, or fetching a remote page, can take several seconds.
const SLOW = { timeout: 60000 }

export const analyzeText = (payload, options = {}) => apiClient.post('/analysis', payload, { ...SLOW, ...options }).then((r) => r.data)
export const analyzeUrl = (url, options = {}) => apiClient.post('/analysis/url', { url }, { ...SLOW, ...options }).then((r) => r.data)
export const listPassages = (topic) =>
  apiClient.get('/evidence/passages', { ...SLOW, params: topic ? { topic } : {} }).then((r) => r.data)
export const searchPassages = (q, topK = 5) =>
  apiClient.get('/evidence/search', { ...SLOW, params: { q, top_k: topK } }).then((r) => r.data)

// Server messages for these codes are written by us and safe to show.
const SAFE_SERVER_MESSAGE = /^(URL_|EXTRACTION_FAILED|TOO_MANY_REQUESTS|CONFLICT|PAYLOAD_TOO_LARGE|MODEL_UNAVAILABLE)/

/** Turns an Axios error into a short, user-safe message. */
export function describeError(error) {
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'The request took too long. Please try again.'
      : 'Cannot reach the backend. Make sure it is running, then try again.'
  }
  const { status, data } = error.response
  const apiError = data?.error
  if (apiError?.code && SAFE_SERVER_MESSAGE.test(apiError.code) && apiError.message) return apiError.message
  if (status === 404) return 'That item was not found.'
  if (status === 413) return 'The submitted content is too large.'
  if (status === 422) {
    const first = apiError?.details?.[0]
    return first ? `Invalid input: ${first.message}` : 'The input was not accepted.'
  }
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.'
  if (status === 503) return 'Analysis components are not available on the server.'
  return 'The server could not complete the request.'
}
