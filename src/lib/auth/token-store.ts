const TOKEN_KEY = 'kurio:token'

let cachedToken: string | null | undefined

export function getAuthToken(): string | null {
  if (cachedToken !== undefined) return cachedToken
  try {
    cachedToken = localStorage.getItem(TOKEN_KEY)
  } catch {
    cachedToken = null
  }
  return cachedToken
}

export function setAuthToken(token: string) {
  cachedToken = token
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignora — sessão só dura a aba atual
  }
}

export function clearAuthToken() {
  cachedToken = null
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignora
  }
}
