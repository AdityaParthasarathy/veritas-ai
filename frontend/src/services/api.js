import axios from 'axios'

// Same-origin by default: the browser calls /api/v1 on the host that served the app. On Vercel the frontend project
// rewrites /api to the backend project; in development the Vite dev server proxies it. VITE_API_BASE_URL is an
// optional override for a split deployment (then the backend must allow this origin through FRONTEND_URL).
const baseURL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

/** Single Axios instance used by every service module. */
export const apiClient = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 8000,
  headers: { Accept: 'application/json' },
})

export const API_ORIGIN = baseURL
