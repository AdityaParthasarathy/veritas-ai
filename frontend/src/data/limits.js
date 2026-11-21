// Input rules shared by the landing composer and the investigation workspace.
export const MAX_CHARS = 20000
export const MIN_CHARS = 20
export const URL_PATTERN = /^https?:\/\/\S+$/i

/** Returns an error sentence, or null when the input is acceptable. */
export function validateInput(mode, { text = '', url = '' }) {
  if (mode === 'text') {
    const length = text.trim().length
    return length < MIN_CHARS ? `Add at least ${MIN_CHARS} characters. ${Math.max(0, MIN_CHARS - length)} to go.` : null
  }
  return URL_PATTERN.test(url.trim()) ? null : 'Enter a full address starting with http:// or https://.'
}
