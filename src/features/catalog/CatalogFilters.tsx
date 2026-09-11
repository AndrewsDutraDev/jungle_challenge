import { useEffect, useState } from 'react'
import type { CatalogSearch } from '@/routes/index'
import { CATEGORY_LABELS, CATEGORY_OPTIONS, NETWORK_LABELS, NETWORK_OPTIONS } from '@/mocks/fixtures'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { useNftFacetsQuery } from '@/lib/api/nfts'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NftCategory, Network } from '@/types/api'

interface CatalogFiltersProps {
  search: CatalogSearch
  onChange: (next: Partial<CatalogSearch>) => void
}

/**
 * A caixa do checkbox fica visualmente oculta porque o Figma desenha o filtro
 * como uma linha "rótulo … contagem" — o estado marcado é comunicado por cor
 * *e* peso da fonte (não só cor), e o input continua real: focável, anunciado
 * como checkbox e operável por teclado.
 */
function FilterRow({
  id,
  label,
  count,
  checked,
  onToggle,
}: {
  id: string
  label: string
  count: number | undefined
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label
      htmlFor={id}
      className="relative flex cursor-pointer items-center justify-between gap-3 py-2.5 leading-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
      <span className={cn('text-[15px] transition-colors', checked ? 'font-bold text-text-accent' : 'text-text-secondary')}>{label}</span>
      <span className={cn('text-[15px] font-bold tabular-nums', checked ? 'text-text-accent' : 'text-text-secondary')}>
        {count == null ? '' : `(${count})`}
      </span>
    </label>
  )
}

export function CatalogFilters({ search, onChange }: CatalogFiltersProps) {
  const { data: facets } = useNftFacetsQuery({
    q: search.q,
    category: search.category as NftCategory[] | undefined,
    network: search.network as Network[] | undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
  })

  const floor = facets?.priceRange.min ?? 0
  const ceiling = facets?.priceRange.max ?? 4
  const [priceDraft, setPriceDraft] = useState<[number, number]>([search.minPrice ?? floor, search.maxPrice ?? ceiling])

  // Sem limites reais no primeiro render (facets ainda carregando), o slider
  // nasce com o range provisório; ao chegar, alinha o que o usuário não mexeu.
  useEffect(() => {
    setPriceDraft([search.minPrice ?? floor, search.maxPrice ?? ceiling])
  }, [floor, ceiling, search.minPrice, search.maxPrice])

  function toggleArrayValue<T extends string>(list: T[] | undefined, value: T): T[] | undefined {
    const current = list ?? []
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    return next.length ? next : undefined
  }

  return (
    <div className="w-full rounded-lg bg-surface-card p-5" aria-label="Filtros do catálogo" role="group">
      <fieldset className="mb-10">
        <legend className="mb-3 text-body-lg font-bold text-foreground">Coleções</legend>
        <div className="px-3">
          {CATEGORY_OPTIONS.map((category) => (
            <FilterRow
              key={category}
              id={`cat-${category}`}
              label={CATEGORY_LABELS[category]}
              count={facets?.categories[category]}
              checked={(search.category ?? []).includes(category)}
              onToggle={() =>
                onChange({ category: toggleArrayValue<NftCategory>(search.category as NftCategory[] | undefined, category), page: 1 })
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-10">
        <legend className="mb-3 text-body-lg font-bold text-foreground">Faixa de preço</legend>
        <div className="space-y-3 pl-3">
          <Slider
            min={floor}
            max={ceiling}
            step={0.01}
            value={priceDraft}
            onValueChange={(v) => setPriceDraft(v as [number, number])}
            aria-label="Faixa de preço em ETH"
          />
          <p className="text-[15px] text-foreground">
            Preço: {formatEth(priceDraft[0].toFixed(4))} – {formatEth(priceDraft[1].toFixed(4))}
          </p>
          <Button
            size="sm"
            className="text-[16px] font-bold"
            onClick={() =>
              onChange({
                minPrice: priceDraft[0] > floor ? priceDraft[0] : undefined,
                maxPrice: priceDraft[1] < ceiling ? priceDraft[1] : undefined,
                page: 1,
              })
            }
          >
            Aplicar
          </Button>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-body-lg font-bold text-foreground">Rede</legend>
        <div className="px-3">
          {NETWORK_OPTIONS.map((network) => (
            <FilterRow
              key={network}
              id={`net-${network}`}
              label={NETWORK_LABELS[network]}
              count={facets?.networks[network]}
              checked={(search.network ?? []).includes(network)}
              onToggle={() =>
                onChange({ network: toggleArrayValue<Network>(search.network as Network[] | undefined, network), page: 1 })
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}
