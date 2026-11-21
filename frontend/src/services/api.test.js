import { afterEach, describe, expect, it, vi } from 'vitest'

// api.js reads VITE_API_BASE_URL when it is first imported, so each case sets the variable and re-imports the module.
async function loadClient(value) {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', value)
  return (await import('./api')).apiClient
}

describe('API client base address', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('calls /api/v1 on its own origin when nothing is configured, never a hard-coded host', async () => {
    const client = await loadClient('')
    expect(client.defaults.baseURL).toBe('/api/v1')
    expect(client.defaults.baseURL).not.toMatch(/localhost|127\.0\.0\.1|^https?:/)
  })

  it('still honours an explicit override for a split deployment (trailing slash removed)', async () => {
    const client = await loadClient('https://api.example.com/')
    expect(client.defaults.baseURL).toBe('https://api.example.com/api/v1')
  })
})
