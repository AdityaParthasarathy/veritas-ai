const MODEL_TEXT = { ready: 'models ready', loading: 'models loading', not_loaded: 'models not loaded yet', unavailable: 'models unavailable', unknown: 'models unknown' }

/** One or two words for the top bar. */
export function shortReadout(readout) {
  if (readout.loading && readout.api === 'unknown') return 'checking'
  if (readout.api !== 'online') return 'offline'
  if (readout.database !== 'connected') return 'database down'
  return { ready: 'ready', loading: 'loading models', not_loaded: 'models idle', unavailable: 'no models' }[readout.models] ?? 'online'
}

/** Summarises the live health readout as a tone and an accessible sentence. */
export function describeReadout(readout) {
  if (readout.loading && readout.api === 'unknown') return { tone: 'idle', label: 'Checking system' }
  if (readout.api !== 'online') return { tone: 'down', label: 'API unreachable' }
  const parts = ['API online', readout.database === 'connected' ? 'database connected' : `database ${readout.database}`, MODEL_TEXT[readout.models] ?? MODEL_TEXT.unknown]
  const healthy = readout.database === 'connected' && readout.models === 'ready'
  const degraded = readout.database === 'connected' && ['loading', 'not_loaded'].includes(readout.models)
  return { tone: healthy ? 'ok' : degraded ? 'warm' : 'down', label: parts.join(', ') }
}
