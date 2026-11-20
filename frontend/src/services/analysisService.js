import { apiClient } from './api'

// Model loading on the first request can take several seconds.
const SLOW = { timeout: 60000 }

export const analyzeText = (payload) => apiClient.post('/analysis', payload, SLOW).then((r) => r.data)
export const listPassages = (topic) =>
  apiClient.get('/evidence/passages', { ...SLOW, params: topic ? { topic } : {} }).then((r) => r.data)
export const searchPassages = (q, topK = 5) =>
  apiClient.get('/evidence/search', { ...SLOW, params: { q, top_k: topK } }).then((r) => r.data)

/** Turns an Axios error into a short, user-safe message. */
export function describeError(error) {
  if (!error.response) return 'Cannot reach the backend. Make sure it is running, then try again.'
  const { status, data } = error.response
  const apiError = data?.error
  if (status === 422) {
    const first = apiError?.details?.[0]
    return first ? `Invalid input: ${first.message}` : 'The input was not accepted.'
  }
  if (status === 503) return apiError?.message || 'Analysis components are not available on the server.'
  return 'The server could not complete the request.'
}
