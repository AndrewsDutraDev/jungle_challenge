import { http, HttpResponse } from 'msw'
import type { Cart, CartMutationPayload } from '@/types/api'
import { getDb, saveDb } from '../db'
import { applyNetworkDelay, maybeFailConnection, maybeServerError } from '../scenarios'
import { errors } from '../respond'
import { getOrCreateCart, resolveCartOwnerKey } from './cart-shared'

async function toCartResponse(ownerKey: string): Promise<Cart> {
  const db = await getDb()
  const cart = await getOrCreateCart(ownerKey)
  return {
    id: cart.ownerKey,
    couponCode: cart.couponCode,
    updatedAt: cart.updatedAt,
    items: cart.items
      .map((item) => {
        const nft = db.nfts.find((n) => n.id === item.nftId)
        if (!nft) return null
        return { nftId: item.nftId, quantity: item.quantity, nft }
      })
      .filter((v): v is Cart['items'][number] => v !== null),
  }
}

export const cartHandlers = [
  http.get('/api/cart', async ({ request }) => {
    await applyNetworkDelay()
    const resolved = await resolveCartOwnerKey(request)
    if (!resolved) return errors.unauthorized('Identificação de carrinho ausente.')
    if (resolved.expired) return errors.sessionExpired()
    return HttpResponse.json(await toCartResponse(resolved.ownerKey))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    await applyNetworkDelay()
    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }
    const forcedError = maybeServerError()
    if (forcedError) return errors.transient(forcedError)

    const resolved = await resolveCartOwnerKey(request)
    if (!resolved) return errors.unauthorized('Identificação de carrinho ausente.')
    if (resolved.expired) return errors.sessionExpired()

    const payload = (await request.json()) as CartMutationPayload
    const db = await getDb()
    const nft = db.nfts.find((n) => n.id === payload.nftId)
    if (!nft) return errors.notFound('NFT não encontrado.')
    if (payload.quantity < 1) return errors.validation('Quantidade deve ser ao menos 1.', { quantity: 'Quantidade inválida.' })

    const cart = await getOrCreateCart(resolved.ownerKey)
    const existing = cart.items.find((i) => i.nftId === payload.nftId)
    const nextQuantity = (existing?.quantity ?? 0) + payload.quantity
    if (nextQuantity > nft.editionsAvailable) {
      return errors.availabilityConflict(`Apenas ${nft.editionsAvailable} edição(ões) disponível(is).`)
    }
    if (existing) existing.quantity = nextQuantity
    else cart.items.push({ nftId: payload.nftId, quantity: payload.quantity })
    cart.updatedAt = new Date().toISOString()
    saveDb()

    return HttpResponse.json(await toCartResponse(resolved.ownerKey), { status: 201 })
  }),

  http.patch('/api/cart/items/:nftId', async ({ request, params }) => {
    await applyNetworkDelay()
    const resolved = await resolveCartOwnerKey(request)
    if (!resolved) return errors.unauthorized('Identificação de carrinho ausente.')
    if (resolved.expired) return errors.sessionExpired()

    const { quantity } = (await request.json()) as { quantity: number }
    const db = await getDb()
    const nft = db.nfts.find((n) => n.id === params.nftId)
    if (!nft) return errors.notFound('NFT não encontrado.')
    if (quantity < 1) return errors.validation('Quantidade deve ser ao menos 1.', { quantity: 'Quantidade inválida.' })
    if (quantity > nft.editionsAvailable) {
      return errors.availabilityConflict(`Apenas ${nft.editionsAvailable} edição(ões) disponível(is).`)
    }

    const cart = await getOrCreateCart(resolved.ownerKey)
    const item = cart.items.find((i) => i.nftId === params.nftId)
    if (!item) return errors.notFound('Item não está no carrinho.')
    item.quantity = quantity
    cart.updatedAt = new Date().toISOString()
    saveDb()

    return HttpResponse.json(await toCartResponse(resolved.ownerKey))
  }),

  http.delete('/api/cart/items/:nftId', async ({ request, params }) => {
    await applyNetworkDelay()
    const resolved = await resolveCartOwnerKey(request)
    if (!resolved) return errors.unauthorized('Identificação de carrinho ausente.')
    if (resolved.expired) return errors.sessionExpired()

    const cart = await getOrCreateCart(resolved.ownerKey)
    cart.items = cart.items.filter((i) => i.nftId !== params.nftId)
    cart.updatedAt = new Date().toISOString()
    saveDb()

    return HttpResponse.json(await toCartResponse(resolved.ownerKey))
  }),

  http.post('/api/cart/coupon', async ({ request }) => {
    await applyNetworkDelay()
    const resolved = await resolveCartOwnerKey(request)
    if (!resolved) return errors.unauthorized('Identificação de carrinho ausente.')
    if (resolved.expired) return errors.sessionExpired()

    const { code } = (await request.json()) as { code: string }
    const db = await getDb()
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase())
    const expired = coupon?.expiresAt ? new Date(coupon.expiresAt).getTime() < Date.now() : false

    if (!coupon) return errors.validation('Cupom inválido.', { couponCode: 'Este código não existe.' })
    if (expired) return errors.validation('Cupom expirado.', { couponCode: 'Este cupom expirou.' })

    const cart = await getOrCreateCart(resolved.ownerKey)
    cart.couponCode = coupon.code
    cart.updatedAt = new Date().toISOString()
    saveDb()

    return HttpResponse.json(await toCartResponse(resolved.ownerKey))
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    await applyNetworkDelay()
    const resolved = await resolveCartOwnerKey(request)
    if (!resolved) return errors.unauthorized('Identificação de carrinho ausente.')
    if (resolved.expired) return errors.sessionExpired()

    const cart = await getOrCreateCart(resolved.ownerKey)
    cart.couponCode = null
    cart.updatedAt = new Date().toISOString()
    saveDb()

    return HttpResponse.json(await toCartResponse(resolved.ownerKey))
  }),
]
