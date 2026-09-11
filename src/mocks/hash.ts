/** SHA-256 em hexadecimal (64 caracteres). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Hash simples (SHA-256) só para a simulação — nunca guardamos senha em claro. */
export async function hashPassword(password: string): Promise<string> {
  return sha256Hex(`kurio::${password}`)
}
