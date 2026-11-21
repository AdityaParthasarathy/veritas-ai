import axios from 'axios'
import { getToken } from './tokenStore'

const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

/** Single Axios instance used by every service module. */
export const apiClient = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 8000,
  headers: { Accept: 'application/json' },
})

export const API_ORIGIN = baseURL

// A 401 on a request that carried a token means the session expired or was revoked.
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler
}

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Login/register failures (no token sent) are handled by their forms instead.
    if (error.response?.status === 401 && error.config?.headers?.Authorization) onUnauthorized()
    return Promise.reject(error)
  },
)
