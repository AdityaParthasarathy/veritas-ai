// The token lives in sessionStorage: it survives a page reload but not closing the tab, and it is only ever
// sent to the API. Like any script-readable storage it is exposed to XSS; see docs/auth.md.
const STORAGE_KEY = 'veritas.token'

function read() {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

let token = read()

export const getToken = () => token

export function setToken(value) {
  token = value
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable: the session lasts until reload */
  }
}
