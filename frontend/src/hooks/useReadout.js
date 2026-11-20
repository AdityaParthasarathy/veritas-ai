import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../services/api'
import { getLiveStatus, getReadyStatus } from '../services/systemService'

const INITIAL = { loading: true, api: 'unknown', database: 'unknown', models: 'unknown', loadSeconds: null, checkedAt: null }

async function readStatus() {
  const [live, ready, models] = await Promise.allSettled([
    getLiveStatus(),
    getReadyStatus(),
    apiClient.get('/health/models').then((r) => r.data),
  ])
  const apiOnline = live.status === 'fulfilled' && live.value?.status === 'alive'
  let database = 'unknown'
  if (apiOnline) {
    if (ready.status === 'fulfilled') database = ready.value?.database === 'connected' ? 'connected' : 'disconnected'
    else if (ready.reason?.response?.status === 503) database = 'disconnected'
  }
  const modelData = apiOnline && models.status === 'fulfilled' ? models.value : null
  return {
    loading: false,
    api: apiOnline ? 'online' : 'offline',
    database,
    models: modelData?.status ?? 'unknown', // not_loaded | loading | ready | unavailable
    loadSeconds: modelData?.load_seconds ?? null,
    checkedAt: new Date(),
  }
}

/**
 * Live system readout from the real health endpoints. Re-checks every `intervalMs` while the tab is visible,
 * and whenever the window regains focus. Nothing is assumed: values stay "unknown" until the backend answers.
 */
export function useReadout(intervalMs = 45000) {
  const [state, setState] = useState(INITIAL)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    readStatus().then((next) => !cancelled && setState(next))
    return () => {
      cancelled = true
    }
  }, [attempt])

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && setAttempt((n) => n + 1)
    const timer = setInterval(tick, intervalMs)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', tick)
    }
  }, [intervalMs])

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }))
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, refresh }
}
