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
    <dl className="space-y-3 text-[15px] text-foreground">
      <div className="flex items-center justify-between">
        <dt>Subtotal</dt>
        <dd className="text-[18px]">{formatEth(quote.subtotalEth)}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt>Desconto do lançamento</dt>
        <dd className={quote.couponValid ? 'text-success' : undefined}>
          {quote.couponValid ? `(−) ${formatEth(quote.discountEth)}` : formatEth('0')}
        </dd>
      </div>
      <div className="flex items-center justify-between">
        <dt>Taxa de rede</dt>
        <dd className="text-[18px]">{formatEth(quote.networkFeeEth)}</dd>
      </div>
      <p className="text-right text-[12px] text-text-accent">Taxa estimada</p>
      <div className="flex items-center justify-between font-bold">
        <dt className="text-[16px]">Total</dt>
        <dd className="text-[18px] text-text-accent">{formatEth(quote.totalEth)}</dd>
      </div>
    </dl>
  )
}
