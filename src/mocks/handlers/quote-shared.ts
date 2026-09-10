import type { DbCart } from '../db'
import { getDb, saveDb } from '../db'
import type { Quote, QuoteLine } from '@/types/api'

function round(value: number, decimals = 4): string {
  return value.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '') || '0'
}

/**
 * Recalcula a cotação a partir do estado vivo dos NFTs e, como efeito
 * colateral, atualiza o snapshot `lastQuoted*` de cada item do carrinho —
 * é esse snapshot que permite sinalizar "o preço mudou desde a última vez
 * que você viu o resumo".
 */
export async function computeQuote(cart: DbCart, persistSnapshot = true): Promise<Quote> {
  const db = await getDb()
  const lines: QuoteLine[] = []
  let subtotal = 0

  for (const item of cart.items) {
    const nft = db.nfts.find((n) => n.id === item.nftId)
    if (!nft) continue
    const unitPrice = Number(nft.priceEth)
    const lineSubtotal = unitPrice * item.quantity
    subtotal += lineSubtotal

    const priceChanged = item.lastQuotedPriceEth != null && item.lastQuotedPriceEth !== nft.priceEth
    const availabilityChanged =
      item.lastQuotedAvailable != null && item.lastQuotedAvailable !== nft.editionsAvailable

    lines.push({
      nftId: nft.id,
      quantity: item.quantity,
      unitPriceEth: nft.priceEth,
      subtotalEth: round(lineSubtotal),
      availableEditions: nft.editionsAvailable,
      nftVersion: nft.version,
      priceChanged,
      availabilityChanged,
    })

    if (persistSnapshot) {
      item.lastQuotedPriceEth = nft.priceEth
      item.lastQuotedAvailable = nft.editionsAvailable
    }
  }

  let couponValid = false
  let discount = 0
  if (cart.couponCode) {
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === cart.couponCode?.toUpperCase())
    const expired = coupon?.expiresAt ? new Date(coupon.expiresAt).getTime() < Date.now() : false
    if (coupon && !expired) {
      couponValid = true
      discount = subtotal * (coupon.value / 100)
    }
  }

  const networkFee = cart.items.length ? Math.max(0.004, subtotal * 0.006) : 0
  const total = Math.max(0, subtotal - discount + networkFee)

  if (persistSnapshot) saveDb()

  return {
    lines,
    subtotalEth: round(subtotal),
    discountEth: round(discount),
    networkFeeEth: round(networkFee),
    totalEth: round(total),
    couponCode: cart.couponCode,
    couponValid,
    isStale: lines.some((l) => l.priceChanged || l.availabilityChanged) || lines.some((l) => l.quantity > l.availableEditions),
    quotedAt: new Date().toISOString(),
  }
}
