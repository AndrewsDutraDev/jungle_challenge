import type { Page } from '@playwright/test'

/**
 * Chama a API mockada a partir do contexto do NAVEGADOR (não do lado Node do
 * Playwright) — necessário para atravessar a interceptação do MSW — e já
 * inclui o Bearer token da sessão (mesma chave usada por `token-store.ts`),
 * já que uma chamada `fetch` direta não passa pelo interceptor do Axios que
 * normalmente injeta esse header.
 */
export async function fetchOrders(page: Page): Promise<{ items: Array<{ id: string; status: string }> }> {
  return page.evaluate(async () => {
    const token = window.localStorage.getItem('kurio:token')
    const res = await fetch('/api/orders', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return res.json()
  })
}

export interface EmittedNftEvent {
  eventId: string
  nftId: string
  version: number
  priceEth: string
  editionsAvailable: number
}

/**
 * Plano de controle dos mocks: muda o NFT "no servidor" num instante escolhido
 * pelo teste. O banco é atualizado e o `nft.updated` sai pelo Socket.IO
 * simulado — a interface recebe pelo `socket.io-client` real.
 */
export async function updateNftOnServer(
  page: Page,
  nftId: string,
  patch: { priceEth?: string; editionsAvailable?: number },
): Promise<EmittedNftEvent> {
  return page.evaluate(
    async ({ id, body }) => {
      const res = await fetch(`/api/mocks/nfts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Falha ao alterar o NFT simulado: HTTP ${res.status}`)
      return res.json()
    },
    { id: nftId, body: patch },
  )
}

/** Reenvia pelo Socket.IO um evento já emitido, idêntico — entrega duplicada ou atrasada. */
export async function replayEvent(page: Page, eventId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const res = await fetch(`/api/mocks/events/${id}/replay`, { method: 'POST' })
    if (!res.ok) throw new Error(`Falha ao reenviar o evento: HTTP ${res.status}`)
  }, eventId)
}

/** Id do NFT a partir da URL do detalhe (`/nft/:id`). */
export function nftIdFromUrl(url: string): string {
  const id = new URL(url).pathname.split('/nft/')[1]
  if (!id) throw new Error(`URL não é de detalhe de NFT: ${url}`)
  return decodeURIComponent(id)
}
