import { apiClient } from './api'

export const getPerformance = () => apiClient.get('/models/performance').then((r) => r.data)
