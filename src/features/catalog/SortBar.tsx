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
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabValue)}>
          <TabsList className="border-b-0">
            <TabsTrigger value="all">Todos os NFTs</TabsTrigger>
            <TabsTrigger value="recent">Novos lançamentos</TabsTrigger>
            <TabsTrigger value="trending">Em alta</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-caption text-text-secondary">
            Ordenar por:
          </label>
          <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger id="sort-select" className="w-52">
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
