import { createFileRoute } from '@tanstack/react-router'
import { NftDetailPage } from '@/features/nft-detail/NftDetailPage'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailPage,
})
