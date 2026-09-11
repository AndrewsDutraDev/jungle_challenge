import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/types/api'
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

/**
 * Últimos eventos emitidos, em ordem. O plano de controle dos mocks
 * (`POST /api/mocks/events/:eventId/replay`) reenvia um deles idêntico —
 * mesmo `eventId` e `version` — para reproduzir entrega duplicada ou atrasada.
 */
const EVENT_LOG_LIMIT = 100
const eventLog: RealtimeEvent[] = []

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

function deliver(event: RealtimeEvent) {
  for (const client of activeClients) {
    try {
      client.emit(event.type, event)
    } catch {
      activeClients.delete(client)
    }
  }
}

function broadcast(event: RealtimeEvent) {
  eventLog.push(event)
  if (eventLog.length > EVENT_LOG_LIMIT) eventLog.shift()
  deliver(event)
}

/** Reenvia um evento já emitido, sem alterar nada. Retorna `null` se ele saiu do histórico. */
export function replayEvent(eventId: string): RealtimeEvent | null {
  const event = eventLog.find((e) => e.eventId === eventId)
  if (!event) return null
  deliver(event)
  return event
}

export function emitNftUpdated(input: {
  nftId: string
  version: number
  priceEth: string
  previousPriceEth: string
  editionsAvailable: number
}): NftUpdatedEvent {
  const event: NftUpdatedEvent = {
    type: 'nft.updated',
    eventId: createId('evt'),
    emittedAt: new Date().toISOString(),
    ...input,
  }
  broadcast(event)
  return event
}

export function emitOrderUpdated(input: {
  orderId: string
  userId: string
  version: number
  status: OrderUpdatedEvent['status']
  transactionHash: string | null
}): OrderUpdatedEvent {
  const event: OrderUpdatedEvent = {
    type: 'order.updated',
    eventId: createId('evt'),
    emittedAt: new Date().toISOString(),
    ...input,
  }
  broadcast(event)
  return event
}

/**
 * Muda preço e/ou disponibilidade de um NFT "no servidor": grava no banco (o
 * próximo GET já reflete) e emite `nft.updated` com a nova versão. É a única
 * porta de entrada para essas mudanças — pedidos, o cenário `price-drift` e
 * o plano de controle dos testes passam todos por aqui, então REST e
 * Socket.IO nunca divergem.
 */
export async function applyNftChange(
  nftId: string,
  patch: { priceEth?: string; editionsAvailable?: number },
): Promise<NftUpdatedEvent | null> {
  const db = await getDb()
  const nft = db.nfts.find((n) => n.id === nftId)
  if (!nft) return null

  const previousPriceEth = nft.priceEth
  if (patch.priceEth !== undefined && patch.priceEth !== nft.priceEth) {
    nft.previousPriceEth = previousPriceEth
    nft.priceEth = patch.priceEth
  }
  if (patch.editionsAvailable !== undefined) {
    nft.editionsAvailable = Math.max(0, Math.floor(patch.editionsAvailable))
  }
  nft.version += 1
  saveDb()

  return emitNftUpdated({
    nftId: nft.id,
    version: nft.version,
    priceEth: nft.priceEth,
    previousPriceEth,
    editionsAvailable: nft.editionsAvailable,
  })
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
let driftTick = 0

/** Zera o histórico de eventos e a sequência do `price-drift` — chamado pelo reset dos mocks. */
export function resetRealtimeState() {
  eventLog.length = 0
  driftTick = 0
}

function roundEth(value: number): string {
  return Math.max(0.001, value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') || '0'
}

/**
 * Inicia (uma única vez) o gerador de mudanças do cenário `price-drift`. Fica
 * ocioso quando o cenário não está ativo ou não há cliente conectado. A
 * sequência é fixa: percorre em rodízio os NFTs que estão em algum carrinho
 * (em ordem de id), alterna +15% / −15% no preço e tira uma edição a cada
 * três mudanças.
 */
export function startPriceDriftDriver() {
  if (driftInterval) return
  driftInterval = setInterval(async () => {
    if (!isScenario('price-drift') || !hasActiveConnections()) return

    const db = await getDb()
    const cartedIds = [...new Set(db.carts.flatMap((c) => c.items.map((i) => i.nftId)))].sort()
    const candidates = cartedIds.length > 0 ? cartedIds : db.nfts.slice(0, 1).map((n) => n.id)
    if (candidates.length === 0) return

    const tick = driftTick++
    const nft = db.nfts.find((n) => n.id === candidates[tick % candidates.length])
    if (!nft) return

    const direction = tick % 2 === 0 ? 1.15 : 0.85
    const loseEdition = tick % 3 === 2 && nft.editionsAvailable > 0
    await applyNftChange(nft.id, {
      priceEth: roundEth(Number(nft.priceEth) * direction),
      editionsAvailable: loseEdition ? nft.editionsAvailable - 1 : undefined,
    })
  }, PRICE_DRIFT_INTERVAL_MS)
}
