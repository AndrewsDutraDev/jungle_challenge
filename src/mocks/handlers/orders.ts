import { http, HttpResponse } from 'msw'
import type { CreateOrderPayload, Order, OrderStatus } from '@/types/api'
import { createId, getDb, saveDb, type DbOrder, type DbState } from '../db'
import { sha256Hex } from '../hash'
import { applyNetworkDelay, isScenario, maybeFailConnection, sleep } from '../scenarios'
import { errors } from '../respond'
import { resolveSession } from '../session'
import { getOrCreateCart, ownerKeyForUser } from './cart-shared'
import { computeQuote } from './quote-shared'
import { applyNftChange, emitOrderUpdated } from '../socket'
import { fromWei, toWei } from '@/lib/eth'
import { validateCheckoutForm } from '@/lib/checkout/collector'

/** Tempo até a "rede de pagamento" decidir um pedido pendente — fixo, para ser reproduzível. */
const ORDER_OUTCOME_DELAY_MS = 3000

type NftMeta = { name: string; seed: number; palette: [string, string]; tokenId: string; imageUrl: string }

function nftMetaById(db: DbState): Map<string, NftMeta> {
  return new Map(db.nfts.map((n) => [n.id, { name: n.name, seed: n.seed, palette: n.palette, tokenId: n.tokenId, imageUrl: n.imageUrl }]))
}

function toApiOrder(order: DbOrder, nftsById: Map<string, NftMeta>): Order {
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
    collector: order.collector ?? null,
    recipientAddress: order.recipientAddress ?? null,
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
        subtotalEth: fromWei(toWei(item.unitPriceEth) * BigInt(item.quantity), 4),
      }
    }),
  }
}

/** Resolve o desfecho de um pedido pendente que já deveria ter sido decidido — cobre reload/reconexão. */
async function resolveOrderIfDue(order: DbOrder): Promise<DbOrder> {
  if (order.status !== 'pending') return order
  if (Date.now() < order.outcomeAt) return order

  const db = await getDb()
  const declined = isScenario('order-declined')
  order.status = declined ? 'declined' : 'confirmed'
  // Referência de transação simulada: 64 dígitos hexadecimais, estável para o pedido.
  order.transactionHash = declined ? null : `0x${await sha256Hex(`kurio-tx:${order.id}:${order.idempotencyKey}`)}`
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
    // Desconta só as quantidades compradas: edições do mesmo NFT que entraram
    // no carrinho enquanto o pedido estava pendente continuam lá. Roda uma
    // única vez por pedido (na passagem de pendente para confirmado), então
    // reconsultas e reconexões não descontam em dobro.
    const cart = db.carts.find((c) => c.ownerKey === ownerKeyForUser(order.userId))
    if (cart) {
      const purchased = new Map(order.items.map((i) => [i.nftId, i.quantity]))
      cart.items = cart.items
        .map((item) => ({ ...item, quantity: item.quantity - (purchased.get(item.nftId) ?? 0) }))
        .filter((item) => item.quantity > 0)
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
    if (!payload.collector) return errors.validation('Dados do colecionador ausentes.')

    // Mesmas regras do formulário: a API não confia só na validação da tela.
    const fieldErrors = validateCheckoutForm({ ...payload.collector, recipientAddress: payload.recipientAddress ?? null })
    if (Object.keys(fieldErrors).length) return errors.validation('Verifique os dados do colecionador.', fieldErrors)

    const db = await getDb()

    // Recuperação por idempotência: mesma tentativa retorna o mesmo pedido, sem duplicar.
    const existing = db.orders.find((o) => o.userId === context.user.id && o.idempotencyKey === payload.idempotencyKey)
    if (existing) {
      const sameRequest =
        existing.walletId === payload.walletId &&
        existing.network === payload.network &&
        (existing.recipientAddress ?? null) === (payload.recipientAddress ?? null) &&
        JSON.stringify(existing.collector ?? null) === JSON.stringify(payload.collector)
      if (!sameRequest) return errors.idempotencyMismatch()
      await resolveOrderIfDue(existing)
      return HttpResponse.json(toApiOrder(existing, nftMetaById(db)), { status: 200 })
    }

    const wallet = db.wallets.find((w) => w.id === payload.walletId && w.userId === context.user.id)
    if (!wallet) return errors.validation('Carteira inválida.', { walletId: 'Selecione uma carteira cadastrada.' })
    if (!wallet.connected) {
      return errors.validation('Conecte a carteira antes de confirmar a compra.', { walletId: 'Carteira desconectada.' })
    }

    const cart = await getOrCreateCart(ownerKeyForUser(context.user.id))
    if (cart.items.length === 0) return errors.validation('Carrinho vazio.')

    // Cenário "sold-out": no instante da confirmação, outro colecionador leva a
    // última edição de um item do carrinho. O evento sai pelo Socket.IO e a
    // revalidação logo abaixo recusa a cotação — o mesmo caminho de uma
    // corrida real entre dois compradores.
    if (isScenario('sold-out')) {
      const target = cart.items.find((item) => (db.nfts.find((n) => n.id === item.nftId)?.editionsAvailable ?? 0) > 0)
      if (target) await applyNftChange(target.nftId, { editionsAvailable: 0 })
    }

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
      collector: payload.collector,
      recipientAddress: payload.recipientAddress ?? null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      version: 1,
      idempotencyKey: payload.idempotencyKey,
      outcomeAt: now + ORDER_OUTCOME_DELAY_MS,
    }
    db.orders.push(order)
    saveDb()

    // Debita a disponibilidade; `applyNftChange` emite nft.updated para
    // catálogo/detalhe/carrinho de outras abas.
    for (const line of quote.lines) {
      const nft = db.nfts.find((n) => n.id === line.nftId)
      if (nft) await applyNftChange(nft.id, { editionsAvailable: nft.editionsAvailable - line.quantity })
    }
    scheduleResolution(order.id, ORDER_OUTCOME_DELAY_MS)

    await applyNetworkDelay()
    if (isScenario('order-timeout')) await sleep(5200)

    return HttpResponse.json(toApiOrder(order, nftMetaById(db)), { status: 201 })
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const db = await getDb()
    const order = db.orders.find((o) => o.id === params.id)
    if (!order) return errors.notFound('Pedido não encontrado.')
    if (order.userId !== context.user.id) return errors.forbidden('Este pedido pertence a outra conta.')
    await resolveOrderIfDue(order)

    return HttpResponse.json(toApiOrder(order, nftMetaById(db)))
  }),

  http.get('/api/orders', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const db = await getDb()
    const orders = db.orders.filter((o) => o.userId === context.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    for (const o of orders) await resolveOrderIfDue(o)
    return HttpResponse.json({ items: orders.map((o) => toApiOrder(o, nftMetaById(db))) })
  }),
]

export type { OrderStatus }
