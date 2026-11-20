import { apiClient } from './api'

export const registerUser = (payload) => apiClient.post('/auth/register', payload).then((r) => r.data)
export const loginUser = (payload) => apiClient.post('/auth/login', payload).then((r) => r.data)
export const fetchCurrentUser = () => apiClient.get('/auth/me').then((r) => r.data)
export const changePasswordRequest = (currentPassword, newPassword) =>
  apiClient.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }).then((r) => r.data)
export const deleteAccountRequest = (password) => apiClient.delete('/auth/me', { data: { password } })
