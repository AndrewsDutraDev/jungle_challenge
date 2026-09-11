import { http, HttpResponse } from 'msw'
import type { ExplorerTransaction } from '@/types/api'
import { getDb } from '../db'
import { applyNetworkDelay } from '../scenarios'
import { errors } from '../respond'

/** Número de bloco estável para um hash — o mesmo hash cai sempre no mesmo bloco. */
function blockNumberFor(hash: string): number {
  return 18_000_000 + (parseInt(hash.slice(2, 10), 16) % 2_000_000)
}

/**
 * Explorador de blocos simulado. Público como um explorador real: responde
 * pelo hash da transação e expõe só o que estaria na blockchain (endereços,
 * tokens, valores) — nunca dados da conta, como nome ou e-mail.
 */
export const explorerHandlers = [
  http.get('/api/explorer/tx/:hash', async ({ params }) => {
    await applyNetworkDelay()
    const db = await getDb()
    const order = db.orders.find((o) => o.status === 'confirmed' && o.transactionHash === params.hash)
    if (!order || !order.transactionHash) return errors.notFound('Transação não encontrada na rede simulada.')

    const payer = db.wallets.find((w) => w.id === order.walletId)?.address ?? null
    const body: ExplorerTransaction = {
      hash: order.transactionHash,
      network: order.network,
      status: 'success',
      blockNumber: blockNumberFor(order.transactionHash),
      timestamp: order.updatedAt,
      from: payer,
      to: order.recipientAddress ?? payer,
      valueEth: order.totalEth,
      feeEth: order.networkFeeEth,
      tokens: order.items.map((item) => {
        const nft = db.nfts.find((n) => n.id === item.nftId)
        return { nftId: item.nftId, name: nft?.name ?? 'NFT', tokenId: nft?.tokenId ?? item.nftId, quantity: item.quantity }
      }),
    }
    return HttpResponse.json(body)
  }),
]
