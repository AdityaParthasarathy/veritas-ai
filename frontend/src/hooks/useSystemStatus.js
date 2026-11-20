import { useCallback, useEffect, useState } from 'react'
import { getLiveStatus, getReadyStatus, getSystemInfo } from '../services/systemService'

const INITIAL = {
  loading: true,
  backend: 'unknown', // 'online' | 'offline' | 'unknown'
  database: 'unknown', // 'connected' | 'disconnected' | 'unknown'
  info: null,
  error: null,
  checkedAt: null,
}

async function fetchSystemStatus() {
  const [live, ready, info] = await Promise.allSettled([getLiveStatus(), getReadyStatus(), getSystemInfo()])

  const backendOnline = live.status === 'fulfilled' && live.value?.status === 'alive'
  let database = 'unknown'
  if (ready.status === 'fulfilled') {
    database = ready.value?.database === 'connected' ? 'connected' : 'disconnected'
  } else if (ready.reason?.response?.status === 503) {
    database = 'disconnected'
  }

  return {
    loading: false,
    backend: backendOnline ? 'online' : 'offline',
    database: backendOnline ? database : 'unknown',
    info: info.status === 'fulfilled' ? info.value : null,
    error: backendOnline
      ? null
      : 'Cannot reach the VERITAS AI backend. Make sure it is running and the API URL is correct.',
    checkedAt: new Date(),
  }
}

/**
 * Queries the real backend health endpoints. Nothing is assumed: the database is
 * only reported as connected when /health/ready says so.
 */
export function useSystemStatus() {
  const [state, setState] = useState(INITIAL)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSystemStatus().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, refresh }
}
