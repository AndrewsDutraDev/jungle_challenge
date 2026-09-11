import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Heart, Linkedin, Mail, Minus, Plus, ShoppingBag, Star, Twitter, ZoomIn } from 'lucide-react'
import { Route } from '@/routes/nft.$nftId'
import { useNftQuery, useRelatedNftsQuery } from '@/lib/api/nfts'
import { useSessionQuery } from '@/lib/api/auth'
import { useFavoritesQuery, useToggleFavoriteMutation } from '@/lib/api/favorites'
import { useAddToCartMutation } from '@/lib/api/cart'
import { NftArt } from '@/components/nft/NftArt'
import { ProductCard } from '@/features/catalog/ProductCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotFound } from '@/components/layout/NotFound'
import { formatEth } from '@/lib/format'
import { CATEGORY_LABELS, NETWORK_LABELS } from '@/mocks/fixtures'
import { KurioApiError } from '@/lib/api/client'
import { useIsMobile } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * A galeria do Figma tem quatro vistas da peça, mas a API expõe um único
 * `seed` por NFT — as vistas são derivadas dele, mantendo a paleta do token e
 * a mesma decisão de arte procedural usada no catálogo (ver NftArt).
 */
const VIEW_OFFSETS = [0, 7, 13, 29]

export function NftDetailPage() {
  const { nftId } = Route.useParams()
  const navigate = useNavigate()
  const { data: nft, isLoading, error } = useNftQuery(nftId)
  const { data: related } = useRelatedNftsQuery(nftId)
  const { data: session } = useSessionQuery()
  const { data: favorites } = useFavoritesQuery(Boolean(session))
  const toggleFavorite = useToggleFavoriteMutation()
  const addToCart = useAddToCartMutation()
  const [quantity, setQuantity] = useState(1)
  const [activeView, setActiveView] = useState(0)
  const isMobile = useIsMobile()

  if (error instanceof KurioApiError && error.status === 404) {
    return <NotFound message="Este NFT não existe ou foi removido." />
  }

  if (isLoading || !nft) {
    // Mesma estrutura (container > breadcrumb > galeria + detalhes) do
    // conteúdo real logo abaixo — se o esqueleto tivesse uma hierarquia
    // diferente, a troca causaria um layout shift enorme (CLS) quando os
    // dados chegassem, em vez de só substituir os blocos de conteúdo.
    return (
      <div className="container py-6">
        <p className="text-[15px] font-bold leading-4">
          <span className="invisible">Início / Mercado</span>
        </p>
        <div className="mt-3 flex flex-col gap-8 lg:flex-row">
          <div className="flex gap-4 lg:w-[573px]">
            <div className="flex shrink-0 gap-4 max-lg:flex-row lg:w-[100px] lg:flex-col">
              {VIEW_OFFSETS.map((_, i) => (
                <Skeleton key={i} className="h-[100px] w-[100px] rounded-lg" />
              ))}
            </div>
            <Skeleton className="aspect-square flex-1 rounded-md" />
          </div>
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-11 w-40" />
          </div>
        </div>
      </div>
    )
  }

  const isFavorite = favorites?.some((f) => f.id === nft.id) ?? false
  const soldOut = nft.editionsAvailable === 0
  const maxQuantity = Math.max(1, Math.min(nft.editionsAvailable, 20))
  const roundedRating = Math.round(nft.rating)

  async function handleAddToCart(goToCheckout: boolean) {
    try {
      await addToCart.mutateAsync({ nftId: nft!.id, quantity })
      toast.success(`${nft!.name} adicionado ao carrinho.`)
      navigate({ to: goToCheckout ? '/cart' : '/nft/$nftId', params: { nftId: nft!.id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar ao carrinho.')
    }
  }

  return (
    <div className="container py-6">
      <p className="text-[15px] font-bold leading-4 text-foreground">
        <Link to="/" className="hover:text-text-accent">
          Início
        </Link>{' '}
        / <span className="text-text-accent">Mercado</span>
      </p>

      <div className="mt-3 flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-col-reverse gap-4 lg:w-[573px] lg:flex-row lg:gap-7">
          <div className="flex gap-3 lg:w-[100px] lg:shrink-0 lg:flex-col lg:gap-4">
            {VIEW_OFFSETS.map((offset, index) => (
              <button
                key={offset}
                type="button"
                onClick={() => setActiveView(index)}
                aria-label={`Ver imagem ${index + 1} de ${VIEW_OFFSETS.length}`}
                aria-pressed={activeView === index}
                className={cn(
                  'aspect-square flex-1 overflow-hidden rounded-lg bg-surface-card lg:size-[100px] lg:flex-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activeView === index ? 'border border-primary' : 'border border-transparent',
                )}
              >
                <NftArt seed={nft.seed + offset} palette={nft.palette} title="" />
              </button>
            ))}
          </div>

          <div className="relative flex min-w-0 flex-1 items-center justify-center rounded-md bg-surface-card p-4 max-lg:bg-gradient-to-br max-lg:from-surface-card max-lg:to-surface-raised">
            {/* No mobile o Figma põe voltar e favoritar flutuando sobre a arte. */}
            <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between lg:hidden">
              <button
                type="button"
                onClick={() => window.history.back()}
                aria-label="Voltar"
                className="flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft className="size-5" />
              </button>
              {session ? (
                <button
                  type="button"
                  onClick={() => toggleFavorite.mutate({ nftId: nft.id, isFavorite })}
                  aria-pressed={isFavorite}
                  className="flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="sr-only">Favoritar</span>
                  <Heart className={cn('size-4', isFavorite && 'fill-primary text-primary')} />
                </button>
              ) : (
                <Link
                  to="/login"
                  search={{ redirect: `/nft/${nft.id}` }}
                  className="flex size-[35px] items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="sr-only">Favoritar</span>
                  <Heart className="size-4" />
                </Link>
              )}
            </div>
            <div className="aspect-square w-full overflow-hidden rounded-3xl">
              <NftArt seed={nft.seed + VIEW_OFFSETS[activeView]} palette={nft.palette} title={nft.name} />
            </div>
            <span
              aria-hidden
              className="absolute right-4 top-4 hidden size-[30px] items-center justify-center rounded-full bg-ink/60 text-text-primary lg:flex"
            >
              <ZoomIn className="size-4" />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 lg:justify-between lg:gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-foreground">{nft.name}</h1>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[22px] font-bold leading-4 text-text-accent">{formatEth(nft.priceEth)}</span>
              <span className="flex items-center gap-1 text-[15px] text-foreground">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    aria-hidden
                    className={cn('size-[15px]', i < roundedRating ? 'fill-accent text-accent' : 'fill-secondary/30 text-secondary/30')}
                  />
                ))}
                <span className="ml-1 max-sm:hidden">
                  {nft.reviewsCount} {nft.reviewsCount === 1 ? 'avaliação' : 'avaliações'} de colecionadores
                </span>
                <span className="ml-1 sm:hidden">
                  {nft.rating.toFixed(1)} ({nft.reviewsCount})
                </span>
              </span>
            </div>
            <div className="mt-3 border-t border-border" />
          </div>

          <div>
            <p className="text-[15px] font-bold leading-4 text-foreground">Sobre este NFT:</p>
            <p className="mt-3 text-body leading-6 text-text-secondary">{nft.description}</p>
          </div>

          <div>
            <p className="text-[15px] font-bold leading-4 text-foreground">Edição:</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <EditionChip active>
                {nft.editionIndex}/{nft.editionSize}
              </EditionChip>
              <EditionChip>
                {nft.editionsAvailable} {nft.editionsAvailable === 1 ? 'disponível' : 'disponíveis'}
              </EditionChip>
              <EditionChip>{soldOut ? 'ESGOTADA' : 'ABERTA'}</EditionChip>
            </div>
          </div>

          {!isMobile && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              {!soldOut && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-[44px] w-[33px] items-center justify-center rounded-full border border-ink bg-primary text-primary-foreground shadow-card disabled:opacity-40"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-6 text-center text-[20px] leading-7 text-foreground" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-[44px] w-[33px] items-center justify-center rounded-full border border-ink bg-primary text-primary-foreground shadow-card disabled:opacity-40"
                    disabled={quantity >= maxQuantity}
                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="h-10 w-[130px] text-[14px] font-bold"
                  disabled={soldOut || addToCart.isPending}
                  onClick={() => handleAddToCart(true)}
                >
                  {soldOut ? 'Esgotado' : addToCart.isPending ? 'Adicionando…' : 'COMPRAR'}
                </Button>

                {session ? (
                  <Button
                    variant="outline"
                    className="h-10 w-[130px] border-primary text-[14px] font-medium text-text-accent"
                    onClick={() => toggleFavorite.mutate({ nftId: nft.id, isFavorite })}
                    aria-pressed={isFavorite}
                  >
                    <Heart className={isFavorite ? 'fill-primary text-primary' : ''} /> Favoritar
                  </Button>
                ) : (
                  <Button variant="outline" className="h-10 w-[130px] border-primary text-[14px] font-medium text-text-accent" asChild>
                    <Link to="/login" search={{ redirect: `/nft/${nft.id}` }}>
                      <Heart /> Favoritar
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          <div>
            <dl className="space-y-3 text-[15px] text-secondary">
              <div className="flex gap-2">
                <dt>ID do token:</dt>
                <dd>#{nft.tokenId}</dd>
              </div>
              <div className="flex gap-2">
                <dt>Coleção:</dt>
                <dd>{nft.collection}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt>Atributos:</dt>
                <dd>{nft.attributes.map((a) => a.value).join(', ')}</dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-[15px] font-bold leading-4 text-foreground">Compartilhar este NFT:</span>
              <span className="flex items-center gap-2 text-text-secondary" aria-label="Compartilhar (ilustrativo)">
                <Linkedin aria-hidden className="size-4" />
                <Mail aria-hidden className="size-[18px]" />
                <Twitter aria-hidden className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="mt-24 block">
        <TabsList className="w-full justify-start gap-8">
          <TabsTrigger value="details" className="text-[17px]">
            Detalhes do NFT
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-[17px]">
            Avaliações de colecionadores ({nft.reviewsCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 text-body leading-6 text-text-secondary">
          <p>{nft.description}</p>
          <div>
            <p className="font-bold text-foreground">Rede:</p>
            <p>
              Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS. Categoria:{' '}
              {CATEGORY_LABELS[nft.category]}.
            </p>
          </div>
          <div>
            <p className="font-bold text-foreground">Contrato:</p>
            <p className="break-all">{nft.contractAddress} • Contrato inteligente ERC-721 verificado.</p>
          </div>
          <div>
            <p className="font-bold text-foreground">Direitos autorais:</p>
            <p>
              {(nft.royaltyBps / 100).toFixed(2)}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="text-body leading-6 text-text-secondary">
          <p>
            Média de {nft.rating.toFixed(1)} de 5 em {nft.reviewsCount} avaliações de colecionadores verificados.
          </p>
        </TabsContent>
      </Tabs>

      {related && related.items.length > 0 && (
        <section className="mt-24">
          <h2 className="text-[17px] font-bold leading-4 text-text-accent">Mais desta coleção</h2>
          <div className="mt-3 border-t border-border" />
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {related.items.slice(0, 5).map((item) => (
              <ProductCard key={item.id} nft={item} />
            ))}
          </div>
        </section>
      )}

      {isMobile && (
        <>
          {/* Espaço para a barra de compra não cobrir o fim do conteúdo. */}
          <div aria-hidden className="h-[164px]" />
          <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[40px] bg-surface-card px-6 pb-9 pt-5 shadow-popover">
            <div className="flex items-center justify-between">
              {!soldOut ? (
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-medium leading-4 text-text-secondary">Qtd.</span>
                  <button
                    type="button"
                    className="flex h-[30px] w-5 items-center justify-center rounded-full border border-ink bg-primary text-primary-foreground disabled:opacity-40"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-5 text-center text-[18px] font-medium leading-[25px] text-foreground" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-[30px] w-5 items-center justify-center rounded-full border border-ink bg-primary text-primary-foreground disabled:opacity-40"
                    disabled={quantity >= maxQuantity}
                    onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              ) : (
                <span className="text-[15px] font-medium text-text-secondary">Edição esgotada</span>
              )}
              <span className="text-[20px] font-bold leading-4 text-text-accent">{formatEth(nft.priceEth)}</span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button
                className="h-[60px] flex-1 rounded-[40px] bg-gradient-to-r from-primary to-primary/80 text-[16px] font-bold"
                disabled={soldOut || addToCart.isPending}
                onClick={() => handleAddToCart(true)}
              >
                {soldOut ? 'Esgotado' : addToCart.isPending ? 'Adicionando…' : 'Comprar NFT'}
              </Button>
              <Link
                to="/cart"
                aria-label="Ir para o carrinho"
                className="flex size-[60px] shrink-0 items-center justify-center rounded-[40px] border border-border bg-surface-raised text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ShoppingBag className="size-5" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EditionChip({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-7 items-center justify-center rounded-full border px-3 text-[14px] leading-4',
        active ? 'border-primary font-medium text-text-accent' : 'border-border-soft text-text-secondary',
      )}
    >
      {children}
    </span>
  )
}
