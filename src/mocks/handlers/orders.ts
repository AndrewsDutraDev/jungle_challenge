import { http, HttpResponse } from 'msw'
import type { CreateOrderPayload, Order, OrderStatus } from '@/types/api'
import { createId, getDb, saveDb, type DbOrder } from '../db'
import { applyNetworkDelay, isScenario, maybeFailConnection, sleep } from '../scenarios'
import { errors } from '../respond'
import { resolveSession } from '../session'
import { getOrCreateCart, ownerKeyForUser } from './cart-shared'
import { computeQuote } from './quote-shared'
import { emitNftUpdated, emitOrderUpdated } from '../socket'

function toApiOrder(order: DbOrder, nftsById: Map<string, { name: string; seed: number; palette: [string, string]; tokenId: string; imageUrl: string }>): Order {
  return {
    id: order.id,
    status: order.status,
    subtotalEth: order.subtotalEth,
    discountEth: order.discountEth,
    networkFeeEth: order.networkFeeEth,
    totalEth: order.totalEth,
    walletId: order.walletId,
    network: order.network,
    transactionHash: order.transactionHash,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    version: order.version,
    items: order.items.map((item) => {
      const meta = nftsById.get(item.nftId)
      return {
        nftId: item.nftId,
        name: meta?.name ?? 'NFT',
        imageUrl: meta?.imageUrl ?? '',
        imageSeed: meta?.seed ?? 0,
        palette: meta?.palette ?? ['#D28A4C', '#241612'],
        tokenId: meta?.tokenId ?? item.nftId,
        quantity: item.quantity,
        unitPriceEth: item.unitPriceEth,
        subtotalEth: (Number(item.unitPriceEth) * item.quantity).toFixed(4),
      }
    }),
  }
}

/** Resolve o desfecho de um pedido pendente que já deveria ter sido decidido — cobre reload/reconexão. */
async function resolveOrderIfDue(order: DbOrder): Promise<DbOrder> {
  if (order.status !== 'pending') return order
  if (Date.now() < order.outcomeAt) return order

  const db = await getDb()
  const declined = isScenario('order-declined') || Math.random() < 0.12
  order.status = declined ? 'declined' : 'confirmed'
  order.transactionHash = declined ? null : `0x${createId('tx').replace(/[^a-f0-9]/gi, '').padEnd(64, '0').slice(0, 64)}`
  order.updatedAt = new Date().toISOString()
  order.version += 1
  saveDb()

  emitOrderUpdated({
    orderId: order.id,
    userId: order.userId,
    version: order.version,
    status: order.status,
    transactionHash: order.transactionHash,
  })

  if (!declined) {
    const cartKey = ownerKeyForUser(order.userId)
    const cart = db.carts.find((c) => c.ownerKey === cartKey)
    if (cart) {
      const purchasedIds = new Set(order.items.map((i) => i.nftId))
      cart.items = cart.items.filter((i) => !purchasedIds.has(i.nftId))
      cart.couponCode = null
      cart.updatedAt = new Date().toISOString()
      saveDb()
    }
  }

  return order
}

function scheduleResolution(orderId: string, delayMs: number) {
  setTimeout(async () => {
    const db = await getDb()
    const order = db.orders.find((o) => o.id === orderId)
    if (order) await resolveOrderIfDue(order)
  }, delayMs + 20)
}

export const orderHandlers = [
  http.post('/api/orders', async ({ request }) => {
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized('Faça login para concluir a compra.')

    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }

    const payload = (await request.json()) as CreateOrderPayload
    if (!payload.idempotencyKey) return errors.validation('idempotencyKey é obrigatória.')

    const db = await getDb()

    // Recuperação por idempotência: mesma tentativa retorna o mesmo pedido, sem duplicar.
    const existing = db.orders.find((o) => o.userId === context.user.id && o.idempotencyKey === payload.idempotencyKey)
    if (existing) {
      const sameRequest = existing.walletId === payload.walletId && existing.network === payload.network
      if (!sameRequest) return errors.idempotencyMismatch()
      await resolveOrderIfDue(existing)
      const nftsById = new Map(db.nfts.map((n) => [n.id, { name: n.name, seed: n.seed, palette: n.palette, tokenId: n.tokenId, imageUrl: n.imageUrl }]))
      return HttpResponse.json(toApiOrder(existing, nftsById), { status: 200 })
    }

    const wallet = db.wallets.find((w) => w.id === payload.walletId && w.userId === context.user.id)
    if (!wallet) return errors.validation('Carteira inválida.', { walletId: 'Selecione uma carteira cadastrada.' })

    const cart = await getOrCreateCart(ownerKeyForUser(context.user.id))
    if (cart.items.length === 0) return errors.validation('Carrinho vazio.')

    cart.couponCode = payload.couponCode
    const quote = await computeQuote(cart, false)

    const versionMismatch = quote.lines.some((line) => payload.quotedVersions[line.nftId] !== line.nftVersion)
    const totalMismatch = quote.totalEth !== payload.quotedTotalEth
    const overAvailable = quote.lines.some((line) => line.quantity > line.availableEditions)
    if (versionMismatch || totalMismatch || overAvailable) {
      return errors.availabilityConflict('Preço, disponibilidade ou taxas mudaram. Revise o resumo antes de confirmar.')
    }

    // Reserva o pedido (e debita a disponibilidade) IMEDIATAMENTE, antes de
    // qualquer atraso simulado de rede — é isso que garante que um segundo
    // clique ou uma nova tentativa após timeout do cliente encontrem esta
    // mesma reserva pelo caminho de idempotência acima, em vez de criar um
    // pedido duplicado. O atraso abaixo afeta só quando a RESPOSTA chega ao
    // cliente, não quando o pedido passa a existir no servidor.
    const now = Date.now()
    const order: DbOrder = {
      id: createId('order'),
      userId: context.user.id,
      status: 'pending',
      items: quote.lines.map((l) => ({ nftId: l.nftId, quantity: l.quantity, unitPriceEth: l.unitPriceEth })),
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      walletId: payload.walletId,
      network: payload.network,
      transactionHash: null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      version: 1,
      idempotencyKey: payload.idempotencyKey,
      outcomeAt: now + 2200 + Math.random() * 1600,
    }
    db.orders.push(order)

    // Debita a disponibilidade e emite nft.updated para refletir em catálogo/detalhe/carrinho de outras abas.
    for (const line of quote.lines) {
      const nft = db.nfts.find((n) => n.id === line.nftId)
      if (!nft) continue
      const previousPriceEth = nft.priceEth
      nft.editionsAvailable = Math.max(0, nft.editionsAvailable - line.quantity)
      nft.version += 1
      emitNftUpdated({
        nftId: nft.id,
        version: nft.version,
        priceEth: nft.priceEth,
        previousPriceEth,
        editionsAvailable: nft.editionsAvailable,
      })
    }
    saveDb()
    scheduleResolution(order.id, order.outcomeAt - now)

    await applyNetworkDelay()
    if (isScenario('order-timeout')) await sleep(5200)

    const nftsById = new Map(db.nfts.map((n) => [n.id, { name: n.name, seed: n.seed, palette: n.palette, tokenId: n.tokenId, imageUrl: n.imageUrl }]))
    return HttpResponse.json(toApiOrder(order, nftsById), { status: 201 })
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const db = await getDb()
    const order = db.orders.find((o) => o.id === params.id && o.userId === context.user.id)
    if (!order) return errors.notFound('Pedido não encontrado.')
    await resolveOrderIfDue(order)

    const nftsById = new Map(db.nfts.map((n) => [n.id, { name: n.name, seed: n.seed, palette: n.palette, tokenId: n.tokenId, imageUrl: n.imageUrl }]))
    return HttpResponse.json(toApiOrder(order, nftsById))
  }),

  http.get('/api/orders', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const db = await getDb()
    const orders = db.orders.filter((o) => o.userId === context.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    for (const o of orders) await resolveOrderIfDue(o)
    const nftsById = new Map(db.nfts.map((n) => [n.id, { name: n.name, seed: n.seed, palette: n.palette, tokenId: n.tokenId, imageUrl: n.imageUrl }]))
    return HttpResponse.json({ items: orders.map((o) => toApiOrder(o, nftsById)) })
  }),
]

export type { OrderStatus }
