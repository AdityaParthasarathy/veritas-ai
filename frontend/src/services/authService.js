import { apiClient } from './api'

export const registerUser = (payload) => apiClient.post('/auth/register', payload).then((r) => r.data)
export const loginUser = (payload) => apiClient.post('/auth/login', payload).then((r) => r.data)
export const fetchCurrentUser = () => apiClient.get('/auth/me').then((r) => r.data)
