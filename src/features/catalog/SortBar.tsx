import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CatalogSearch } from '@/routes/index'
import type { SortOption } from '@/types/api'

const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  trending: 'Em alta',
}

type TabValue = 'all' | 'recent' | 'trending'

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
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabValue)} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="gap-5 border-b-0">
            <TabsTrigger value="all" className="whitespace-nowrap text-[15px]">
              Todos os NFTs
            </TabsTrigger>
            <TabsTrigger value="recent" className="whitespace-nowrap text-[15px]">
              Novos lançamentos
            </TabsTrigger>
            <TabsTrigger value="trending" className="whitespace-nowrap text-[15px]">
              Em alta
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
