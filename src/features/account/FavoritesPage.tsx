import { Link } from '@tanstack/react-router'
import { useFavoritesQuery } from '@/lib/api/favorites'
import { ProductCard } from '@/features/catalog/ProductCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from './AccountLayout'

/** NFTs favoritados pelo colecionador. Desfavoritar pelo card remove o item na hora (atualização otimista). */
export function FavoritesPage() {
  const { data: favorites, isLoading, isError, isFetching, refetch } = useFavoritesQuery(true)

  return (
    <AccountLayout title="Favoritos" description="NFTs que você marcou para acompanhar.">
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Carregando favoritos">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {isError && !favorites && (
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-6 text-center">
          <p className="text-body font-medium text-text-primary">Não foi possível carregar seus favoritos.</p>
          <Button size="sm" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Tentando…' : 'Tentar novamente'}
          </Button>
        </div>
      )}

      {favorites && favorites.length === 0 && (
        <div className="rounded-lg border border-border bg-surface-card p-10 text-center">
          <p className="text-body-lg font-bold text-text-primary">Você ainda não favoritou nenhum NFT.</p>
          <p className="mt-2 text-caption text-text-secondary">Use o coração nos cards ou no detalhe de um NFT para salvá-lo aqui.</p>
          <Button asChild className="mt-4">
            <Link to="/">Explorar catálogo</Link>
          </Button>
        </div>
      )}

      {favorites && favorites.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {favorites.map((nft) => (
            <ProductCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}
    </AccountLayout>
  )
}
