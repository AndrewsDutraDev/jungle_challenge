import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Mail, XCircle } from 'lucide-react'
import { Route } from '@/routes/pedido.$orderId'
import { useOrderQuery } from '@/lib/api/orders'
import { NftArt } from '@/components/nft/NftArt'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatEth, formatDateTime } from '@/lib/format'
import { clearIdempotencyKey } from '@/lib/checkout/idempotency'

export function OrderConfirmationPage() {
  const { orderId } = Route.useParams()
  const { data: order, isLoading } = useOrderQuery(orderId)

  useEffect(() => {
    if (order && order.status !== 'pending') clearIdempotencyKey()
  }, [order])

  if (isLoading || !order) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center py-14">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (order.status === 'pending') {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-3 py-14 text-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-body-lg font-bold text-text-primary">Processando seu pedido…</p>
        <p className="max-w-sm text-caption text-text-secondary">
          Isso é atualizado automaticamente — não é preciso recarregar a página. Pode levar alguns segundos.
        </p>
      </div>
    )
  }

  if (order.status === 'declined') {
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-3 py-14 text-center">
        <XCircle className="h-10 w-10 text-danger" />
        <p className="text-body-lg font-bold text-text-primary">Pagamento recusado</p>
        <p className="max-w-sm text-caption text-text-secondary">
          A simulação de pagamento não confirmou este pedido. Nenhum valor foi debitado e os itens seguem no seu carrinho.
        </p>
        <div className="mt-2 flex gap-3">
          <Button asChild variant="outline">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
          <Button asChild>
            <Link to="/checkout">Tentar novamente</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container flex justify-center py-14">
      <Card className="w-full max-w-lg bg-surface-dark p-6">
        <div className="flex flex-col items-center text-center">
          <Mail className="h-10 w-10 text-primary" />
          <h1 className="mt-3 text-heading font-bold text-text-primary">Seus NFTs agora estão na sua carteira</h1>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 text-tiny sm:grid-cols-4">
          <div>
            <p className="text-text-secondary">ID da transação</p>
            <p className="font-medium text-text-primary">{order.transactionHash?.slice(0, 10)}…</p>
          </div>
          <div>
            <p className="text-text-secondary">Data</p>
            <p className="font-medium text-text-primary">{formatDateTime(order.updatedAt)}</p>
          </div>
          <div>
            <p className="text-text-secondary">Total</p>
            <p className="font-medium text-primary">{formatEth(order.totalEth)}</p>
          </div>
          <div>
            <p className="text-text-secondary">Carteira</p>
            <p className="font-medium text-text-primary">{order.network}</p>
          </div>
        </div>

        <h2 className="mb-3 mt-5 text-body font-bold text-text-primary">Detalhes da transação</h2>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.nftId} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md">
                <NftArt seed={item.imageSeed} palette={item.palette} title={item.name} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-caption font-medium text-text-primary">{item.name}</p>
                <p className="text-tiny text-text-secondary">ID do token: #{item.tokenId}</p>
              </div>
              <span className="text-caption text-text-secondary">x{item.quantity}</span>
              <span className="text-caption font-bold text-primary">{formatEth(item.subtotalEth)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 border-t border-border pt-3 text-caption text-text-secondary">
          <div className="flex justify-between">
            <span>Taxa de rede</span>
            <span>{formatEth(order.networkFeeEth)}</span>
          </div>
          <div className="flex justify-between text-body font-bold text-text-primary">
            <span>Total</span>
            <span className="text-primary">{formatEth(order.totalEth)}</span>
          </div>
        </div>

        <p className="mt-4 text-center text-tiny text-text-secondary">
          Transação confirmada na simulação Kurio. A propriedade foi transferida para sua carteira conectada e registrada na rede.
        </p>

        <Button
          variant="outline"
          className="mt-4 w-full"
          disabled
          title="Simulação — não há blockchain real por trás deste pedido"
        >
          Ver no Etherscan
        </Button>
        <Button asChild className="mt-2 w-full">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </Card>
    </div>
  )
}
