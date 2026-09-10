import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Minus, Plus, Heart, Share2, Star } from 'lucide-react'
import { Route } from '@/routes/nft.$nftId'
import { useNftQuery, useRelatedNftsQuery } from '@/lib/api/nfts'
import { useSessionQuery } from '@/lib/api/auth'
import { useFavoritesQuery, useToggleFavoriteMutation } from '@/lib/api/favorites'
import { useAddToCartMutation } from '@/lib/api/cart'
import { NftArt } from '@/components/nft/NftArt'
import { ProductCard } from '@/features/catalog/ProductCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotFound } from '@/components/layout/NotFound'
import { formatEth } from '@/lib/format'
import { CATEGORY_LABELS, NETWORK_LABELS } from '@/mocks/fixtures'
import { KurioApiError } from '@/lib/api/client'
import { toast } from 'sonner'

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

  if (error instanceof KurioApiError && error.status === 404) {
    return <NotFound message="Este NFT não existe ou foi removido." />
  }

  if (isLoading || !nft) {
    // Mesma estrutura (container > breadcrumb > grid de 2 colunas) do
    // conteúdo real logo abaixo — se o esqueleto tivesse uma hierarquia
    // diferente, a troca causaria um layout shift enorme (CLS) quando os
    // dados chegassem, em vez de só substituir os blocos de conteúdo.
    return (
      <div className="container py-10">
        <p className="mb-6 text-caption text-text-secondary">
          <span className="invisible">Início / Carregando…</span>
        </p>
        <div className="grid gap-10 md:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
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
    <div className="container py-10">
      <p className="mb-6 text-caption text-text-secondary">
        <Link to="/" className="hover:text-text-primary">
          Início
        </Link>{' '}
        / <span className="text-text-primary">{nft.name}</span>
      </p>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-lg border border-border">
          <NftArt seed={nft.seed} palette={nft.palette} title={nft.name} />
        </div>

        <div>
          <h1 className="text-heading font-bold text-text-primary">{nft.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-body-lg font-bold text-primary">{formatEth(nft.priceEth)}</span>
            <span className="flex items-center gap-1 text-caption text-text-secondary">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {nft.rating.toFixed(1)} ({nft.reviewsCount} avaliações)
            </span>
          </div>

          <p className="mt-4 text-body text-text-secondary">{nft.description}</p>

          <p className="mt-4 text-caption text-text-secondary">
            Edição: {nft.editionIndex}/{nft.editionSize} ({nft.editionsAvailable} aberta{nft.editionsAvailable === 1 ? '' : 's'})
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            {!soldOut && (
              <div className="flex items-center rounded-md border border-border-soft">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center text-text-primary disabled:opacity-40"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-body font-medium text-text-primary" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center text-text-primary disabled:opacity-40"
                  disabled={quantity >= maxQuantity}
                  onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}

            <Button disabled={soldOut || addToCart.isPending} onClick={() => handleAddToCart(true)}>
              {soldOut ? 'Esgotado' : addToCart.isPending ? 'Adicionando…' : 'COMPRAR'}
            </Button>

            {session ? (
              <Button
                variant="outline"
                onClick={() => toggleFavorite.mutate({ nftId: nft.id, isFavorite })}
                aria-pressed={isFavorite}
              >
                <Heart className={isFavorite ? 'fill-primary text-primary' : ''} /> Favoritar
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/login" search={{ redirect: `/nft/${nft.id}` }}>
                  <Heart /> Favoritar
                </Link>
              </Button>
            )}
          </div>

          <dl className="mt-6 space-y-1 text-caption text-text-secondary">
            <div className="flex gap-2">
              <dt className="font-medium text-text-primary">ID do token:</dt>
              <dd>#{nft.tokenId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-text-primary">Coleção:</dt>
              <dd>{nft.collection}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="font-medium text-text-primary">Atributos:</dt>
              <dd className="flex flex-wrap gap-1.5">
                {nft.attributes.map((a) => (
                  <Badge key={a.trait} variant="outline">
                    {a.value}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-2 text-text-secondary">
            <span className="text-caption">Compartilhar este NFT:</span>
            <Share2 className="h-4 w-4" aria-hidden />
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="mt-12">
        <TabsList>
          <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações de colecionadores ({nft.reviewsCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="max-w-3xl space-y-4 text-body text-text-secondary">
          <p>{nft.description}</p>
          <p>
            <strong className="text-text-primary">Rede:</strong> Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e
            metadados armazenados no IPFS.
          </p>
          <p className="break-all">
            <strong className="text-text-primary">Contrato:</strong> {nft.contractAddress}
          </p>
          <p>
            <strong className="text-text-primary">Direitos autorais:</strong> {(nft.royaltyBps / 100).toFixed(2)}% nas vendas
            secundárias, pagos automaticamente pelo mercado.
          </p>
          <p>
            <strong className="text-text-primary">Categoria:</strong> {CATEGORY_LABELS[nft.category]}
          </p>
        </TabsContent>
        <TabsContent value="reviews" className="text-body text-text-secondary">
          <p>
            Média de {nft.rating.toFixed(1)} de 5 em {nft.reviewsCount} avaliações de colecionadores verificados.
          </p>
        </TabsContent>
      </Tabs>

      {related && related.items.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-body-lg font-bold text-text-primary">Mais desta coleção</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.items.slice(0, 6).map((item) => (
              <ProductCard key={item.id} nft={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
