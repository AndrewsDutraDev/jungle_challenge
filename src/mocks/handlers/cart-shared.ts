import type { DbCart } from '../db'
import { getDb, saveDb } from '../db'
import { resolveSession, getGuestIdHeader } from '../session'

export function ownerKeyForUser(userId: string): string {
  return `user:${userId}`
}

export function ownerKeyForGuest(guestId: string): string {
  return `guest:${guestId}`
}

/**
 * Resolve a chave do dono do carrinho para a requisição: usuário autenticado
 * tem prioridade; sem sessão, cai para o carrinho de visitante identificado
 * pelo header `X-Guest-Id` (gerado e persistido no cliente).
 */
export async function resolveCartOwnerKey(request: Request): Promise<{ ownerKey: string; expired: boolean } | null> {
  const { context, expired } = await resolveSession(request)
  if (context) return { ownerKey: ownerKeyForUser(context.user.id), expired: false }
  if (expired) return { ownerKey: '', expired: true }

  const guestId = getGuestIdHeader(request)
  if (!guestId) return null
  return { ownerKey: ownerKeyForGuest(guestId), expired: false }
}

export async function getOrCreateCart(ownerKey: string): Promise<DbCart> {
  const db = await getDb()
  let cart = db.carts.find((c) => c.ownerKey === ownerKey)
  if (!cart) {
    cart = { ownerKey, items: [], couponCode: null, updatedAt: new Date().toISOString() }
    db.carts.push(cart)
    saveDb()
  }
  return cart
}

/** Ao autenticar, o carrinho de visitante é somado ao carrinho do usuário. */
export async function mergeGuestCartIntoUser(guestId: string, userId: string): Promise<void> {
  const db = await getDb()
  const guestKey = ownerKeyForGuest(guestId)
  const userKey = ownerKeyForUser(userId)
  const guestCart = db.carts.find((c) => c.ownerKey === guestKey)
  if (!guestCart || guestCart.items.length === 0) return

  const userCart = await getOrCreateCart(userKey)
  for (const item of guestCart.items) {
    const existing = userCart.items.find((i) => i.nftId === item.nftId)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      userCart.items.push({ ...item })
    }
  }
  userCart.updatedAt = new Date().toISOString()
  db.carts = db.carts.filter((c) => c.ownerKey !== guestKey)
  saveDb()
}
