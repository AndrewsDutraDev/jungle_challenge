import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from '@/routes/index'
import type { SortOption } from '@/types/api'

const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  trending: 'Em alta',
}

type TabValue = 'all' | 'recent' | 'trending'

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'recent', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

interface SortBarProps {
  total: number
  sort: SortOption
  rawSort: CatalogSearch['sort']
  hasCategoryFilter: boolean
  onSortChange: (sort: SortOption) => void
  onTabChange: (tab: TabValue) => void
}

export function SortBar({ total, sort, rawSort, hasCategoryFilter, onSortChange, onTabChange }: SortBarProps) {
  const activeTab: TabValue = rawSort === 'trending' ? 'trending' : rawSort === 'recent' && !hasCategoryFilter ? 'recent' : 'all'

  return (
    <div className="mb-5 flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/*
          Visualmente são abas, mas não controlam painéis: todas filtram a
          mesma grade. Com Radix Tabs sem `TabsContent`, cada gatilho apontava
          `aria-controls` para um painel inexistente (reprovado no Lighthouse).
          Botões de alternância com `aria-pressed` descrevem isso corretamente.
        */}
        <div
          role="group"
          aria-label="Filtrar vitrine"
          className="-mx-4 flex items-center gap-5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {TABS.map((tab) => {
            const active = tab.value === activeTab
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => !active && onTabChange(tab.value)}
                className={cn(
                  'whitespace-nowrap border-b-2 border-transparent py-3 text-[15px] font-medium text-foreground transition-colors',
                  'hover:text-text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active && 'border-primary font-bold text-text-accent',
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-[15px] text-foreground">
            Ordenar por:
          </label>
          <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger
              id="sort-select"
              className="h-auto w-auto gap-2 border-0 bg-transparent p-0 text-[15px] text-foreground hover:text-text-accent focus:ring-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-caption text-text-secondary" role="status">
          {total} {total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}
        </p>
      </div>
    </div>
  )
}
