import { apiClient } from './api'

export const listAnalyses = (limit = 20, offset = 0) =>
  apiClient.get('/analyses', { params: { limit, offset } }).then((r) => r.data)
export const getAnalysis = (id) => apiClient.get(`/analyses/${id}`, { timeout: 15000 }).then((r) => r.data)
export const deleteAnalysis = (id) => apiClient.delete(`/analyses/${id}`)
