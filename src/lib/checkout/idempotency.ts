const KEY = 'kurio:checkout:idempotencyKey'

function randomKey(): string {
  return `idem_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/**
 * Uma chave de idempotência por tentativa de checkout. Persistida em
 * localStorage para sobreviver a reload/timeout: se o usuário recarregar a
 * página com um pedido pendente, o próximo "Confirmar compra" reusa a mesma
 * chave e recupera o pedido já criado em vez de duplicar a compra.
 */
export function getOrCreateIdempotencyKey(): string {
  try {
    let key = sessionStorage.getItem(KEY)
    if (!key) {
      key = randomKey()
      sessionStorage.setItem(KEY, key)
    }
    return key
  } catch {
    return randomKey()
  }
}

export function clearIdempotencyKey() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignora
  }
}
