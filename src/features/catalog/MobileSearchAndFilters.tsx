import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import type { CatalogSearch } from '@/routes/index'
import { CatalogFilters } from './CatalogFilters'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface MobileSearchAndFiltersProps {
  search: CatalogSearch
  onChange: (next: Partial<CatalogSearch>) => void
}

/** Busca + filtros do topo do catálogo no mobile (Figma "Search Bar", node 70395:239). */
export function MobileSearchAndFilters({ search, onChange }: MobileSearchAndFiltersProps) {
  const [term, setTerm] = useState(search.q ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilters = (search.category?.length ?? 0) + (search.network?.length ?? 0)

  return (
    <div className="flex items-center gap-3 lg:hidden">
      <form
        className="flex h-[45px] flex-1 items-center gap-3 rounded-lg bg-surface-card px-3"
        onSubmit={(e) => {
          e.preventDefault()
          onChange({ q: term || undefined, page: 1 })
        }}
      >
        <Search aria-hidden className="size-[22px] shrink-0 text-text-secondary" />
        <label htmlFor="catalog-search" className="sr-only">
          Explorar coleções
        </label>
        <input
          id="catalog-search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Explorar coleções"
          className="w-full bg-transparent text-body text-text-primary placeholder:text-text-secondary focus-visible:outline-none"
        />
      </form>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={activeFilters > 0 ? `Filtros, ${activeFilters} ativos` : 'Filtros'}
            className="relative flex size-[45px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <SlidersHorizontal className="size-[22px]" />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-ink text-[10px] font-medium text-text-accent">
                {activeFilters}
              </span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogTitle className="text-body-lg font-bold text-text-primary">Filtros</DialogTitle>
          <CatalogFilters search={search} onChange={onChange} />
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            Ver resultados
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
