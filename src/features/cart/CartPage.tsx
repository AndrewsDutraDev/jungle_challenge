import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Minus, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useCartQuery, useApplyCouponMutation, useRemoveCartItemMutation, useRemoveCouponMutation, useUpdateCartItemMutation } from '@/lib/api/cart'
import { useQuoteQuery } from '@/lib/api/quote'
import { useSessionQuery } from '@/lib/api/auth'
import { NftArt } from '@/components/nft/NftArt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderTotals } from './OrderTotals'
import { formatEth } from '@/lib/format'
import { KurioApiError } from '@/lib/api/client'

export function CartPage() {
  const { data: session } = useSessionQuery()
  const { data: cart, isLoading } = useCartQuery()
  const { data: quote, isLoading: quoteLoading } = useQuoteQuery(Boolean(cart && cart.items.length > 0))
  const updateItem = useUpdateCartItemMutation()
  const removeItem = useRemoveCartItemMutation()
  const applyCoupon = useApplyCouponMutation()
  const removeCoupon = useRemoveCouponMutation()
  const navigate = useNavigate()

  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault()
    setCouponError(null)
    try {
      await applyCoupon.mutateAsync(couponInput)
      setCouponInput('')
    } catch (err) {
      setCouponError(err instanceof KurioApiError ? err.message : 'Não foi possível aplicar o cupom.')
    }
  }

  function handleCheckout() {
    if (!session) {
      navigate({ to: '/login', search: { redirect: '/checkout' } })
      return
    }
    navigate({ to: '/checkout' })
  }

  const isEmpty = !isLoading && (!cart || cart.items.length === 0)

  return (
    <div className="container py-10">
      <p className="mb-6 text-caption text-text-secondary">
        <Link to="/" className="hover:text-text-primary">
          Início
        </Link>{' '}
        / <span className="text-text-primary">Carrinho</span>
      </p>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {isEmpty && (
        <div className="rounded-lg border border-border bg-surface-card p-10 text-center">
          <p className="text-body-lg font-bold text-text-primary">Seu carrinho está vazio</p>
          <p className="mt-2 text-caption text-text-secondary">Explore o catálogo e encontre seu próximo NFT.</p>
          <Button className="mt-4" asChild>
            <Link to="/">Explorar catálogo</Link>
          </Button>
        </div>
      )}

      {!isLoading && cart && cart.items.length > 0 && (
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Itens no carrinho</caption>
              <thead>
                <tr className="border-b border-border text-caption text-text-secondary">
                  <th scope="col" className="pb-3 font-medium">
                    NFTs
                  </th>
                  <th scope="col" className="pb-3 font-medium">
                    Preço
                  </th>
                  <th scope="col" className="pb-3 font-medium">
                    Edições
                  </th>
                  <th scope="col" className="pb-3 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="pb-3">
                    <span className="sr-only">Remover</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => {
                  const line = quote?.lines.find((l) => l.nftId === item.nftId)
                  return (
                    <tr key={item.nftId} className="border-b border-border">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md">
                            <NftArt seed={item.nft.seed} palette={item.nft.palette} title={item.nft.name} />
                          </div>
                          <div>
                            <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="text-body font-medium text-text-primary hover:text-primary">
                              {item.nft.name}
                            </Link>
                            <p className="text-tiny text-text-secondary">ID do token: #{item.nft.tokenId}</p>
                            {(line?.priceChanged || line?.availabilityChanged) && (
                              <p className="mt-1 flex items-center gap-1 text-tiny text-warning">
                                <AlertTriangle className="h-3 w-3" /> {line?.priceChanged ? 'Preço mudou' : 'Disponibilidade mudou'}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-body text-text-primary">{formatEth(item.nft.priceEth)}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1 rounded-md border border-border-soft w-fit">
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center text-text-primary disabled:opacity-40"
                            disabled={item.quantity <= 1}
                            onClick={() => updateItem.mutate({ nftId: item.nftId, quantity: item.quantity - 1 })}
                            aria-label={`Diminuir quantidade de ${item.nft.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-caption text-text-primary" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center text-text-primary disabled:opacity-40"
                            disabled={item.quantity >= item.nft.editionsAvailable}
                            onClick={() => updateItem.mutate({ nftId: item.nftId, quantity: item.quantity + 1 })}
                            aria-label={`Aumentar quantidade de ${item.nft.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 text-right font-bold text-primary">
                        {formatEth(line?.subtotalEth ?? Number(item.nft.priceEth) * item.quantity)}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem.mutate(item.nftId)}
                          className="text-text-secondary hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
                          aria-label={`Remover ${item.nft.name} do carrinho`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <aside className="h-fit rounded-lg border border-border bg-surface-card p-5">
            <h2 className="mb-4 text-body-lg font-bold text-text-primary">Resumo da carteira</h2>

            <form onSubmit={handleApplyCoupon} className="mb-4">
              <label htmlFor="coupon" className="mb-1.5 block text-caption text-text-secondary">
                Código promocional
              </label>
              <div className="flex gap-2">
                <Input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Digite o código promocional…"
                  aria-invalid={Boolean(couponError)}
                  aria-describedby={couponError ? 'coupon-error' : undefined}
                />
                <Button type="submit" variant="secondary" disabled={applyCoupon.isPending || !couponInput}>
                  Aplicar
                </Button>
              </div>
              {couponError && (
                <p id="coupon-error" role="alert" className="mt-1 text-tiny text-danger">
                  {couponError}
                </p>
              )}
              {cart.couponCode && (
                <p className="mt-1 flex items-center gap-2 text-tiny text-success">
                  Cupom {cart.couponCode} aplicado.
                  <button type="button" className="underline" onClick={() => removeCoupon.mutate()}>
                    remover
                  </button>
                </p>
              )}
            </form>

            <OrderTotals quote={quote} isLoading={quoteLoading} />

            {quote?.isStale && (
              <p className="mt-3 flex items-start gap-2 rounded-md bg-warning/10 p-2.5 text-tiny text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Alguns preços ou disponibilidades mudaram. Revise antes de continuar.
              </p>
            )}

            <Button className="mt-4 w-full" onClick={handleCheckout} disabled={quoteLoading}>
              Conectar e finalizar
            </Button>
            <Button variant="link" className="mt-2 w-full" asChild>
              <Link to="/">Continuar explorando</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  )
}
