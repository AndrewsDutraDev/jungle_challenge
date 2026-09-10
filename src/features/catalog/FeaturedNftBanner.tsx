import { Link } from '@tanstack/react-router'
import { NftArt } from '@/components/nft/NftArt'
import { Skeleton } from '@/components/ui/skeleton'
import type { Nft } from '@/types/api'

export function FeaturedNftBanner({ nft }: { nft: Nft | undefined }) {
  if (!nft) {
    return <Skeleton className="h-[470px] w-full shrink-0 lg:w-[310px]" />
  }

  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      className="flex shrink-0 flex-col gap-4 rounded-lg bg-gradient-to-b from-primary/10 to-primary/[0.03] p-6 pb-2 lg:w-[310px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-heading font-bold text-text-accent">NFT EM DESTAQUE</p>
        <p className="text-[22px] font-bold text-foreground">OFERTA LIMITADA</p>
      </div>
      <div className="aspect-[310/368] overflow-hidden rounded-[22px]">
        <NftArt seed={nft.seed} palette={nft.palette} title={nft.name} />
      </div>
    </Link>
  )
}
