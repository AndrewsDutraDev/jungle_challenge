import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, X, XCircle } from 'lucide-react'
import { Route } from '@/routes/pedido.$orderId'
import { useOrderQuery } from '@/lib/api/orders'
import { NftArt } from '@/components/nft/NftArt'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatEth, formatDateTime } from '@/lib/format'
import { clearIdempotencyKey } from '@/lib/checkout/idempotency'
import { cn } from '@/lib/utils'

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
      <Card className="relative w-full max-w-[578px] overflow-hidden bg-surface-card p-0">
        <Link
          to="/"
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-5" />
        </Link>

        <div className="flex h-[156px] flex-col items-center justify-center gap-4">
          <ThankYouMark />
          <h1 className="text-center text-[16px] font-bold leading-4 text-text-secondary">
            Seus NFTs agora estão na sua carteira
          </h1>
        </div>

        <div className="h-px bg-primary" />
        <dl className="flex items-center justify-between px-9 py-3 text-text-secondary">
          <MetaField label="ID da transação" value={`${order.transactionHash?.slice(0, 6)}…${order.transactionHash?.slice(-4)}`} bold />
          <span aria-hidden className="h-[31px] w-px bg-border-soft" />
          <MetaField label="Data" value={formatDateTime(order.updatedAt)} />
          <span aria-hidden className="h-[31px] w-px bg-border-soft" />
          <MetaField label="Total" value={formatEth(order.totalEth)} />
          <span aria-hidden className="h-[31px] w-px bg-border-soft" />
          <MetaField label="Carteira" value={order.network} bold />
        </dl>
        <div className="h-px bg-primary" />

        <div className="px-11 pb-12 pt-5">
          <h2 className="text-[15px] font-bold leading-4 text-foreground">Detalhes da transação</h2>

          <div className="mt-3 flex items-center gap-3 text-tiny text-text-secondary">
            <span className="flex-1">NFTs</span>
            <span className="w-14 text-right">Edições</span>
            <span className="w-28 text-right">Subtotal</span>
          </div>

          <ul className="mt-3 space-y-3">
            {order.items.map((item) => (
              <li key={item.nftId} className="flex items-center gap-3">
                <div className="size-11 shrink-0 overflow-hidden rounded-md">
                  <NftArt seed={item.imageSeed} palette={item.palette} title={item.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold leading-4 text-foreground">{item.name}</p>
                  <p className="mt-1.5 text-body leading-4 text-secondary">ID do token: #{item.tokenId}</p>
                </div>
                <span className="w-14 whitespace-nowrap text-right text-body text-text-secondary">(x {item.quantity})</span>
                <span className="w-28 whitespace-nowrap text-right text-[18px] font-bold leading-4 text-text-accent">
                  {formatEth(item.subtotalEth)}
                </span>
              </li>
            ))}
          </ul>

          <div className="ml-auto mt-6 w-[321px] space-y-3">
            <div className="flex items-center justify-between text-[15px] text-foreground">
              <span>Taxa de rede</span>
              <span className="text-[18px]">{formatEth(order.networkFeeEth)}</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-[16px] text-foreground">Total</span>
              <span className="text-[18px] text-text-accent">{formatEth(order.totalEth)}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6 text-center">
            <p className="text-body leading-[22px] text-text-secondary">
              Transação confirmada na simulação Kurio. A propriedade foi transferida para sua carteira conectada e registrada na rede.
            </p>
            <Button
              className="mt-6 h-auto rounded-[5px] p-4 text-[16px] font-bold"
              disabled
              title="Simulação — não há blockchain real por trás deste pedido"
            >
              Ver no Etherscan
            </Button>
            <div>
              <Button asChild variant="link" className="mt-3 text-text-accent">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Faixa laranja de 10px na base do card (node 11:5119). */}
        <div className="h-2.5 bg-primary" />
      </Card>
    </div>
  )
}

function MetaField({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className={cn('text-body leading-4', bold && 'font-bold')}>{label}</dt>
      <dd className="mt-1 truncate text-[15px]">{value}</dd>
    </div>
  )
}

/** Envelope "THANK YOU" do Figma (node 11:5150). */
function ThankYouMark() {
  return (
    <svg viewBox="0 0 80 80" className="size-20 text-primary" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="8" y="22" width="64" height="44" rx="4" />
      <path d="M8 26l32 24 32-24" />
      <rect x="22" y="8" width="36" height="26" rx="3" fill="var(--tw-color-surface-card, #241612)" />
      <text x="40" y="010" fill="currentColor" stroke="none" fontSize="7" textAnchor="middle" fontWeight="700">
        <tspan x="40" y="20">THANK</tspan>
        <tspan x="40" y="29">YOU</tspan>
      </text>
    </svg>
  )
}
