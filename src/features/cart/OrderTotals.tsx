import type { Quote } from '@/types/api'
import { formatEth } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

export function OrderTotals({ quote, isLoading }: { quote: Quote | undefined; isLoading: boolean }) {
  if (isLoading || !quote) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    )
  }

  return (
    <dl className="space-y-2 text-body text-text-secondary">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd className="text-text-primary">{formatEth(quote.subtotalEth)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Desconto do lançamento</dt>
        <dd className={quote.couponValid ? 'text-success' : 'text-text-primary'}>
          {quote.couponValid ? `(−) ${formatEth(quote.discountEth)}` : formatEth('0')}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt>Taxa de rede</dt>
        <dd className="text-text-primary">{formatEth(quote.networkFeeEth)}</dd>
      </div>
      <p className="text-tiny text-text-secondary/70">Taxa estimada</p>
      <div className="flex justify-between border-t border-border pt-2 text-body-lg font-bold">
        <dt className="text-text-primary">Total</dt>
        <dd className="text-primary">{formatEth(quote.totalEth)}</dd>
      </div>
    </dl>
  )
}
