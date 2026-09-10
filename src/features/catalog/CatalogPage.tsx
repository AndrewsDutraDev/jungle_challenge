import { Route } from '@/routes/index'
import { useNftListQuery } from '@/lib/api/nfts'
import { Hero } from './Hero'
import { CatalogFilters } from './CatalogFilters'
import { SortBar } from './SortBar'
import { ProductCard } from './ProductCard'
import { Pagination } from './Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { CatalogSearch } from '@/routes/index'
import type { SortOption } from '@/types/api'

export function CatalogPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const params = {
    q: search.q,
    category: search.category as CatalogSearch['category'],
    network: search.network as CatalogSearch['network'],
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: (search.sort ?? 'recent') as SortOption,
    page: search.page ?? 1,
    pageSize: 9,
  }

  const { data, isLoading, isError, error, isFetching } = useNftListQuery(params)

  function updateSearch(patch: Partial<CatalogSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) })
  }

  return (
    <div>
      <Hero />
      <div className="container flex flex-col gap-8 py-10 md:flex-row">
        <CatalogFilters search={search} onChange={updateSearch} />

        <div className="min-w-0 flex-1">
          <SortBar total={data?.total ?? 0} sort={params.sort} onSortChange={(sort) => updateSearch({ sort, page: 1 })} />

          {isError && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 p-6 text-center" role="alert">
              <p className="text-body font-medium text-text-primary">Não foi possível carregar o catálogo.</p>
              <p className="mt-1 text-caption text-text-secondary">{error instanceof Error ? error.message : 'Tente novamente.'}</p>
            </div>
          )}

          {!isError && isLoading && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Carregando NFTs">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          )}

          {!isError && !isLoading && data && data.items.length === 0 && (
            <div className="rounded-lg border border-border bg-surface-card p-10 text-center">
              <p className="text-body-lg font-bold text-text-primary">Nenhum NFT encontrado</p>
              <p className="mt-2 text-caption text-text-secondary">Tente ajustar os filtros ou o termo buscado.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate({ search: { page: 1 } })}
              >
                Limpar filtros
              </Button>
            </div>
          )}

          {!isError && !isLoading && data && data.items.length > 0 && (
            <>
              <div
                data-testid="catalog-grid"
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                aria-busy={isFetching}
                aria-live="polite"
              >
                {data.items.map((nft) => (
                  <ProductCard key={nft.id} nft={nft} />
                ))}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(page) => updateSearch({ page })} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
