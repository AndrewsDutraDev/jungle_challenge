import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Minus, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useCartQuery, useApplyCouponMutation, useRemoveCartItemMutation, useRemoveCouponMutation, useUpdateCartItemMutation } from '@/lib/api/cart'
import { useQuoteQuery } from '@/lib/api/quote'
import { useNftListQuery } from '@/lib/api/nfts'
import { useSessionQuery } from '@/lib/api/auth'
import { NftArt } from '@/components/nft/NftArt'
import { ProductCard } from '@/features/catalog/ProductCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderTotals } from './OrderTotals'
import { formatEth } from '@/lib/format'
import { KurioApiError } from '@/lib/api/client'
import { useIsMobile } from '@/lib/use-media-query'

export function CartPage() {
  const { data: session } = useSessionQuery()
  const { data: cart, isLoading } = useCartQuery()
  const { data: quote, isLoading: quoteLoading } = useQuoteQuery(Boolean(cart && cart.items.length > 0))
  const { data: suggestions } = useNftListQuery({ sort: 'trending', page: 1, pageSize: 5 })
  const updateItem = useUpdateCartItemMutation()
  const removeItem = useRemoveCartItemMutation()
  const applyCoupon = useApplyCouponMutation()
  const removeCoupon = useRemoveCouponMutation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

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

  /*
    O carrinho mobile do Figma (node 16:360) não é a tabela reflowed: é uma
    lista de cards com a arte à esquerda e o resumo numa folha arredondada
    colada no rodapé.
  */
  if (isMobile && !isEmpty) {
    return (
      <div className="flex min-h-[calc(100vh-68px)] flex-col">
        <div className="flex-1 px-4 pt-8">
          <div className="flex h-11 items-center">
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label="Voltar"
              className="flex size-[35px] shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="flex-1 pr-[35px] text-center text-[20px] font-bold leading-4 text-foreground">Carrinho de NFTs</h1>
          </div>

          {isLoading && (
            <div className="mt-3 space-y-5">
              <Skeleton className="h-[100px] w-full rounded-[14px]" />
              <Skeleton className="h-[100px] w-full rounded-[14px]" />
            </div>
          )}

          <ul className="mt-3 space-y-5">
            {cart?.items.map((item) => {
              const line = quote?.lines.find((l) => l.nftId === item.nftId)
              return (
                <li
                  key={item.nftId}
                  data-testid="cart-item"
                  className="flex h-[100px] overflow-hidden rounded-[14px] bg-surface-card shadow-card"
                >
                  <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="size-[100px] shrink-0">
                    <NftArt seed={item.nft.seed} palette={item.nft.palette} title={item.nft.name} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-2">
                    <p data-testid="cart-item-name" className="truncate text-[15px] font-bold leading-4 text-foreground">{item.nft.name}</p>
                    <p className="whitespace-nowrap text-[14px] leading-4 text-text-secondary">
                      Edição: {item.nft.editionIndex}/{item.nft.editionSize}
                    </p>
                    <p className="text-[18px] font-bold leading-4 text-text-accent">
                      {formatEth(line?.subtotalEth ?? Number(item.nft.priceEth) * item.quantity)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 pr-2">
                    <button
                      type="button"
                      className="flex size-6 items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary disabled:opacity-40"
                      disabled={item.quantity <= 1}
                      onClick={() => updateItem.mutate({ nftId: item.nftId, quantity: item.quantity - 1 })}
                      aria-label={`Diminuir quantidade de ${item.nft.name}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-4 text-center text-[16px] leading-[22px] text-foreground" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="flex size-6 items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary disabled:opacity-40"
                      disabled={item.quantity >= item.nft.editionsAvailable}
                      onClick={() => updateItem.mutate({ nftId: item.nftId, quantity: item.quantity + 1 })}
                      aria-label={`Aumentar quantidade de ${item.nft.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem.mutate(item.nftId)}
                      aria-label={`Remover ${item.nft.name} do carrinho`}
                      className="flex size-6 items-center justify-center rounded-full text-text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <aside className="mt-6 flex flex-col gap-6 rounded-t-[40px] bg-surface-card px-6 pb-9 pt-6">
          <form onSubmit={handleApplyCoupon} className="flex h-[50px] items-center overflow-hidden rounded-[40px] border border-border shadow-card">
            <label htmlFor="coupon" className="sr-only">
              Código promocional
            </label>
            <Input
              id="coupon"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Digite o código promocional…"
              aria-invalid={Boolean(couponError)}
              aria-describedby={couponError ? 'coupon-error' : undefined}
              className="h-full flex-1 rounded-none border-0 bg-transparent pl-4 text-caption placeholder:text-secondary focus-visible:ring-0"
            />
            <Button
              type="submit"
              className="h-full w-[97px] shrink-0 rounded-[40px] text-[15px] font-bold"
              disabled={applyCoupon.isPending || !couponInput}
            >
              Aplicar
            </Button>
          </form>
          {couponError && (
            <p id="coupon-error" role="alert" className="-mt-4 text-tiny text-danger">
              {couponError}
            </p>
          )}
          {cart?.couponCode && (
            <p className="-mt-4 flex items-center gap-2 text-tiny text-success">
              Cupom {cart.couponCode} aplicado.
              <button type="button" className="underline" onClick={() => removeCoupon.mutate()}>
                remover
              </button>
            </p>
          )}

          <OrderTotals quote={quote} isLoading={quoteLoading} />

          {quote?.isStale && (
            <p className="flex items-start gap-2 rounded-md bg-warning/10 p-2.5 text-tiny text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Alguns preços ou disponibilidades mudaram. Revise antes de continuar.
            </p>
          )}

          <Button className="h-[60px] w-full rounded-[40px] text-[16px] font-bold" onClick={handleCheckout} disabled={quoteLoading}>
            Conectar e finalizar
          </Button>
        </aside>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <p className="mb-3 text-[15px] font-bold leading-4 text-foreground">
        <Link to="/" className="hover:text-text-accent">
          Início
        </Link>{' '}
        /{' '}
        <Link to="/" className="hover:text-text-accent">
          Mercado
        </Link>{' '}
        / <span className="text-text-accent">Carrinho</span>
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
            <table className="w-full border-separate border-spacing-y-3 text-left">
              <caption className="sr-only">Itens no carrinho</caption>
              <thead>
                <tr className="border-b border-border text-[16px] text-foreground">
                  <th scope="col" className="pb-3 font-bold">
                    NFTs
                  </th>
                  <th scope="col" className="pb-3 font-medium">
                    Preço
                  </th>
                  <th scope="col" className="pb-3 font-bold">
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
                    <tr key={item.nftId} data-testid="cart-item" className="bg-surface-card">
                      <td className="py-0">
                        <div className="flex items-center gap-4">
                          <div className="size-[70px] shrink-0 overflow-hidden rounded-md">
                            <NftArt seed={item.nft.seed} palette={item.nft.palette} title={item.nft.name} />
                          </div>
                          <div className="py-2">
                            <Link data-testid="cart-item-name" to="/nft/$nftId" params={{ nftId: item.nftId }} className="text-[16px] font-bold leading-4 text-foreground hover:text-text-accent">
                              {item.nft.name}
                            </Link>
                            <p className="mt-1.5 text-[14px] leading-4 text-secondary">ID do token: #{item.nft.tokenId}</p>
                            {(line?.priceChanged || line?.availabilityChanged) && (
                              <p className="mt-1 flex items-center gap-1 text-tiny text-warning">
                                <AlertTriangle className="h-3 w-3" /> {line?.priceChanged ? 'Preço mudou' : 'Disponibilidade mudou'}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-0 text-[16px] font-bold text-text-secondary">{formatEth(item.nft.priceEth)}</td>
                      <td className="py-0">
                        <div className="flex w-fit items-center gap-3">
                          <button
                            type="button"
                            className="flex h-[30px] w-5 items-center justify-center rounded-full border border-ink bg-primary text-primary-foreground shadow-card disabled:opacity-40"
                            disabled={item.quantity <= 1}
                            onClick={() => updateItem.mutate({ nftId: item.nftId, quantity: item.quantity - 1 })}
                            aria-label={`Diminuir quantidade de ${item.nft.name}`}
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="min-w-5 text-center text-[17px] leading-6 text-foreground" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-[30px] w-5 items-center justify-center rounded-full border border-ink bg-primary text-primary-foreground shadow-card disabled:opacity-40"
                            disabled={item.quantity >= item.nft.editionsAvailable}
                            onClick={() => updateItem.mutate({ nftId: item.nftId, quantity: item.quantity + 1 })}
                            aria-label={`Aumentar quantidade de ${item.nft.name}`}
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-0 text-right text-[16px] font-bold text-text-accent">
                        {formatEth(line?.subtotalEth ?? Number(item.nft.priceEth) * item.quantity)}
                      </td>
                      <td className="py-0 pr-6 text-right">
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

          <aside className="h-fit">
            <h2 className="text-body-lg font-bold text-foreground">Resumo da carteira</h2>
            <div className="mb-6 mt-3 border-t border-border" />

            <form onSubmit={handleApplyCoupon} className="mb-6">
              <label htmlFor="coupon" className="mb-2 block text-body font-bold text-foreground">
                Código promocional
              </label>
              <div className="flex h-10 items-center overflow-hidden rounded-[3px] border border-primary">
                <Input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Digite o código promocional…"
                  aria-invalid={Boolean(couponError)}
                  aria-describedby={couponError ? 'coupon-error' : undefined}
                  className="h-full flex-1 rounded-none border-0 bg-transparent text-[12px] placeholder:text-secondary focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  className="h-full w-[102px] shrink-0 rounded-none text-[15px] font-bold"
                  disabled={applyCoupon.isPending || !couponInput}
                >
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

            <Button
              className="mt-6 h-10 w-full rounded-[3px] text-[15px] font-bold"
              onClick={handleCheckout}
              disabled={quoteLoading}
            >
              Conectar e finalizar
            </Button>
            <Button variant="link" className="mt-3 w-full text-[15px] text-text-accent" asChild>
              <Link to="/">Continuar explorando</Link>
            </Button>
          </aside>
        </div>
      )}

      {!isLoading && suggestions && suggestions.items.length > 0 && (
        <section className="mt-24" aria-labelledby="cart-suggestions">
          <h2 id="cart-suggestions" className="text-[17px] font-bold leading-4 text-text-accent">
            Colecionadores também viram
          </h2>
          <div className="mt-3 border-t border-border" />
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {suggestions.items.slice(0, 5).map((nft) => (
              <ProductCard key={nft.id} nft={nft} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
