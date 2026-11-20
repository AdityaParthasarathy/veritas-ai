import { apiClient } from './api'

export const getLiveStatus = () => apiClient.get('/health/live').then((r) => r.data)
export const getReadyStatus = () => apiClient.get('/health/ready').then((r) => r.data)
export const getSystemInfo = () => apiClient.get('/system/info').then((r) => r.data)
