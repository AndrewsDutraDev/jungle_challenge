import type { DbCart } from '../db'
import { getDb, saveDb } from '../db'
import type { Quote, QuoteLine } from '@/types/api'
import { fromWei, maxWei, mulDiv, roundWei, toWei } from '@/lib/eth'

/** Casas decimais de desconto, taxa e totais. */
const QUOTE_DECIMALS = 4
const MIN_NETWORK_FEE = toWei('0.004')

/**
 * Recalcula a cotação a partir do estado vivo dos NFTs e, como efeito
 * colateral, atualiza o snapshot `lastQuoted*` de cada item do carrinho —
 * é esse snapshot que permite sinalizar "o preço mudou desde a última vez
 * que você viu o resumo".
 *
 * Toda a conta é feita em wei (`src/lib/eth.ts`). Desconto e taxa são
 * arredondados antes de somar, então subtotal − desconto + taxa bate
 * exatamente com o total exibido.
 */
export async function computeQuote(cart: DbCart, persistSnapshot = true): Promise<Quote> {
  const db = await getDb()
  const lines: QuoteLine[] = []
  let subtotal = 0n

  for (const item of cart.items) {
    const nft = db.nfts.find((n) => n.id === item.nftId)
    if (!nft) continue
    const lineSubtotal = toWei(nft.priceEth) * BigInt(item.quantity)
    subtotal += lineSubtotal

    const priceChanged = item.lastQuotedPriceEth != null && item.lastQuotedPriceEth !== nft.priceEth
    const availabilityChanged =
      item.lastQuotedAvailable != null && item.lastQuotedAvailable !== nft.editionsAvailable

    lines.push({
      nftId: nft.id,
      quantity: item.quantity,
      unitPriceEth: nft.priceEth,
      subtotalEth: fromWei(lineSubtotal, QUOTE_DECIMALS),
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
  let discount = 0n
  if (cart.couponCode) {
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === cart.couponCode?.toUpperCase())
    const expired = coupon?.expiresAt ? new Date(coupon.expiresAt).getTime() < Date.now() : false
    if (coupon && !expired) {
      couponValid = true
      discount = roundWei(mulDiv(subtotal, BigInt(coupon.value), 100n), QUOTE_DECIMALS)
    }
  }

  // 0,6% do subtotal, com mínimo de 0.004 ETH.
  const networkFee = cart.items.length ? maxWei(MIN_NETWORK_FEE, roundWei(mulDiv(subtotal, 6n, 1000n), QUOTE_DECIMALS)) : 0n
  const total = maxWei(0n, roundWei(subtotal, QUOTE_DECIMALS) - discount + networkFee)

  if (persistSnapshot) saveDb()

  return {
    lines,
    subtotalEth: fromWei(subtotal, QUOTE_DECIMALS),
    discountEth: fromWei(discount, QUOTE_DECIMALS),
    networkFeeEth: fromWei(networkFee, QUOTE_DECIMALS),
    totalEth: fromWei(total, QUOTE_DECIMALS),
    couponCode: cart.couponCode,
    couponValid,
    isStale: lines.some((l) => l.priceChanged || l.availabilityChanged) || lines.some((l) => l.quantity > l.availableEditions),
    quotedAt: new Date().toISOString(),
  }
}
