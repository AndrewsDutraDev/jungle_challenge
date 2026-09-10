import { useState } from 'react'
import type { CatalogSearch } from '@/routes/index'
import { CATEGORY_LABELS, CATEGORY_OPTIONS, NETWORK_LABELS, NETWORK_OPTIONS } from '@/mocks/fixtures'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/format'
import type { NftCategory, Network } from '@/types/api'

const MAX_PRICE = 4

interface CatalogFiltersProps {
  search: CatalogSearch
  onChange: (next: Partial<CatalogSearch>) => void
}

export function CatalogFilters({ search, onChange }: CatalogFiltersProps) {
  const [priceDraft, setPriceDraft] = useState<[number, number]>([search.minPrice ?? 0, search.maxPrice ?? MAX_PRICE])

  function toggleArrayValue<T extends string>(list: T[] | undefined, value: T): T[] {
    const current = list ?? []
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  }

  return (
    <div className="w-full rounded-lg bg-surface-card p-5" aria-label="Filtros do catálogo" role="group">
      <fieldset className="mb-8">
        <legend className="mb-3 text-body font-bold text-text-primary">Coleções</legend>
        <div className="space-y-2.5">
          {CATEGORY_OPTIONS.map((category) => {
            const id = `cat-${category}`
            const checked = (search.category ?? []).includes(category)
            return (
              <div key={category} className="flex items-center gap-2.5">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() =>
                    onChange({ category: toggleArrayValue<NftCategory>(search.category as NftCategory[] | undefined, category), page: 1 })
                  }
                />
                <Label htmlFor={id} className="cursor-pointer text-body font-normal text-text-primary">
                  {CATEGORY_LABELS[category]}
                </Label>
              </div>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 text-body font-bold text-text-primary">Faixa de preço</legend>
        <Slider
          min={0}
          max={MAX_PRICE}
          step={0.1}
          value={priceDraft}
          onValueChange={(v) => setPriceDraft(v as [number, number])}
          aria-label="Faixa de preço em ETH"
        />
        <p className="mt-2 text-caption text-text-secondary">
          Preço: {formatEth(priceDraft[0])} – {formatEth(priceDraft[1])}
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() => onChange({ minPrice: priceDraft[0] || undefined, maxPrice: priceDraft[1], page: 1 })}
        >
          Aplicar
        </Button>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-body font-bold text-text-primary">Rede</legend>
        <div className="space-y-2.5">
          {NETWORK_OPTIONS.map((network) => {
            const id = `net-${network}`
            const checked = (search.network ?? []).includes(network)
            return (
              <div key={network} className="flex items-center gap-2.5">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() =>
                    onChange({ network: toggleArrayValue<Network>(search.network as Network[] | undefined, network), page: 1 })
                  }
                />
                <Label htmlFor={id} className="cursor-pointer text-body font-normal text-text-primary">
                  {NETWORK_LABELS[network]}
                </Label>
              </div>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
