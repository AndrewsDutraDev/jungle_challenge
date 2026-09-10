import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SortOption } from '@/types/api'

const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  trending: 'Em alta',
}

interface SortBarProps {
  total: number
  sort: SortOption
  onSortChange: (sort: SortOption) => void
}

export function SortBar({ total, sort, onSortChange }: SortBarProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-caption text-text-secondary" role="status">
        {total} {total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}
      </p>
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
  )
}
