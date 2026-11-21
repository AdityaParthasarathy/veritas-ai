import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

/** Single Axios instance used by every service module. There is no account or session: every request is anonymous. */
export const apiClient = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 8000,
  headers: { Accept: 'application/json' },
})

export const API_ORIGIN = baseURL
