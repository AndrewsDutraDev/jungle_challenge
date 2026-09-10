import { Link } from '@tanstack/react-router'
import { Heart, Search } from 'lucide-react'
import type { Nft } from '@/types/api'
import { NftArt } from '@/components/nft/NftArt'
import { formatEth } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { useSessionQuery } from '@/lib/api/auth'
import { useFavoritesQuery, useToggleFavoriteMutation } from '@/lib/api/favorites'
import { cn } from '@/lib/utils'

export function ProductCard({ nft }: { nft: Nft }) {
  const { data: session } = useSessionQuery()
  const { data: favorites } = useFavoritesQuery(Boolean(session))
  const toggleFavorite = useToggleFavoriteMutation()
  const isFavorite = favorites?.some((f) => f.id === nft.id) ?? false
  const priceDropped = nft.previousPriceEth != null && Number(nft.previousPriceEth) > Number(nft.priceEth)
  const soldOut = nft.editionsAvailable === 0

  return (
    <div className="group relative flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-card p-2">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="block h-full w-full overflow-hidden rounded-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <NftArt seed={nft.seed} palette={nft.palette} title={nft.name} className="transition-transform duration-300 group-hover:scale-105" />
        </Link>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/60">
            <Badge variant="outline">Esgotado</Badge>
          </div>
        )}
        {nft.editionSize <= 25 && !soldOut && (
          <Badge className="absolute left-2 top-2" variant="warning">
            Raro
          </Badge>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {session && (
            <button
              type="button"
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              onClick={() => toggleFavorite.mutate({ nftId: nft.id, isFavorite })}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-primary text-primary')} />
            </button>
          )}
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            aria-label={`Ver detalhes de ${nft.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Search className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="flex flex-1 flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="truncate text-[16px] font-normal text-text-primary">{nft.name}</span>
        <span className="flex items-center gap-3 text-[18px]">
          <span className="font-bold text-text-accent">{formatEth(nft.priceEth)}</span>
          {priceDropped && <span className="font-normal text-secondary line-through">{formatEth(nft.previousPriceEth!)}</span>}
        </span>
      </Link>
    </div>
  )
}
