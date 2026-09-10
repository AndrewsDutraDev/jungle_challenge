/** Hash simples (SHA-256) só para a simulação — nunca guardamos senha em claro. */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`kurio::${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
