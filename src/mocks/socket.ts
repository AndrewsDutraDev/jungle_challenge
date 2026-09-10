import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/api'
import { createId, getDb, saveDb } from './db'
import { isScenario } from './scenarios'

/**
 * Servidor Socket.IO simulado.
 *
 * `@mswjs/socket.io-binding` intercepta a camada de WebSocket real usada pelo
 * `socket.io-client` (via `@mswjs/interceptors`), então o cliente da aplicação
 * roda sem nenhuma adaptação — ele "acha" que está falando com um servidor de
 * verdade. Limitação documentada: a binding não modela rooms/namespaces, então
 * o broadcast de `order.updated` é feito para todas as conexões ativas e cada
 * cliente descarta eventos que não pertencem ao seu próprio usuário (o payload
 * carrega `userId`). Ver ARCHITECTURE.md § Tempo real.
 *
 * Importante: o socket.io-client precisa ser configurado com
 * `transports: ['websocket']` — a binding só intercepta WebSocket, não o
 * handshake de long-polling que o Engine.IO usa por padrão.
 */

type SocketIoClient = ReturnType<typeof toSocketIo>['client']

const activeClients = new Set<SocketIoClient>()

// "*" casa qualquer conexão WebSocket — necessário porque o MSW normaliza o
// pathname removendo o prefixo "/socket.io/" antes de comparar com o padrão
// do link, e porque o host varia entre dev, preview e o domínio publicado.
export const socketLink = ws.link('*')

export const socketHandler = socketLink.addEventListener('connection', (connection) => {
  const { client } = toSocketIo(connection)
  activeClients.add(client)
  startPriceDriftDriver()

  connection.client.addEventListener('close', () => {
    activeClients.delete(client)
  })
})

function broadcast(event: string, payload: unknown) {
  for (const client of activeClients) {
    try {
      client.emit(event, payload)
    } catch {
      activeClients.delete(client)
    }
  }
}

export function emitNftUpdated(input: {
  nftId: string
  version: number
  priceEth: string
  previousPriceEth: string
  editionsAvailable: number
}) {
  const event: NftUpdatedEvent = {
    type: 'nft.updated',
    eventId: createId('evt'),
    emittedAt: new Date().toISOString(),
    ...input,
  }
  broadcast('nft.updated', event)
}

export function emitOrderUpdated(input: {
  orderId: string
  userId: string
  version: number
  status: OrderUpdatedEvent['status']
  transactionHash: string | null
}) {
  const event: OrderUpdatedEvent = {
    type: 'order.updated',
    eventId: createId('evt'),
    emittedAt: new Date().toISOString(),
    ...input,
  }
  broadcast('order.updated', event)
}

export function hasActiveConnections(): boolean {
  return activeClients.size > 0
}

// ---------------------------------------------------------------------------
// Cenário "price-drift" (README §7): preço/disponibilidade de um NFT mudam
// enquanto o usuário navega — em especial com o item já no carrinho — e a
// interface deve reagir via `nft.updated`, não por polling.
// ---------------------------------------------------------------------------

const PRICE_DRIFT_INTERVAL_MS = 2500
let driftInterval: ReturnType<typeof setInterval> | null = null

function roundEth(value: number): string {
  return Math.max(0.001, value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') || '0'
}

/**
 * Inicia (uma única vez, de forma idempotente) o "gerador" de mudanças de
 * preço/disponibilidade usado pelo cenário `price-drift`. Fica ocioso
 * (retorna cedo) sempre que o cenário ativo não é `price-drift` ou não há
 * nenhum cliente Socket.IO conectado — então não há custo quando o cenário
 * não está em uso. Prioriza NFTs que já estão em algum carrinho, para que o
 * cenário do README ("um NFT no carrinho tem o preço alterado durante a
 * navegação") seja fácil de reproduzir deterministicamente nos testes.
 */
export function startPriceDriftDriver() {
  if (driftInterval) return
  driftInterval = setInterval(async () => {
    if (!isScenario('price-drift') || !hasActiveConnections()) return

    const db = await getDb()
    if (db.nfts.length === 0) return

    const cartedIds = new Set(db.carts.flatMap((c) => c.items.map((i) => i.nftId)))
    const pool = db.nfts.filter((n) => cartedIds.has(n.id))
    const candidates = pool.length > 0 ? pool : db.nfts
    const nft = candidates[Math.floor(Math.random() * candidates.length)]
    if (!nft) return

    const previousPriceEth = nft.priceEth
    const direction = Math.random() < 0.5 ? 0.85 : 1.15
    nft.priceEth = roundEth(Number(nft.priceEth) * direction)
    nft.previousPriceEth = previousPriceEth
    if (nft.editionsAvailable > 0 && Math.random() < 0.35) {
      nft.editionsAvailable -= 1
    }
    nft.version += 1
    saveDb()

    emitNftUpdated({
      nftId: nft.id,
      version: nft.version,
      priceEth: nft.priceEth,
      previousPriceEth,
      editionsAvailable: nft.editionsAvailable,
    })
  }, PRICE_DRIFT_INTERVAL_MS)
}
