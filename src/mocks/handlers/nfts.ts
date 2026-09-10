import { http, HttpResponse } from 'msw'
import type { Nft, NftCategory, Network, Paginated, SortOption } from '@/types/api'
import { getDb } from '../db'
import { applyNetworkDelay, isScenario, maybeFailConnection, maybeServerError } from '../scenarios'
import { errors } from '../respond'

function matchesFilters(
  nft: Nft,
  filters: { q: string | null; categories: string[]; network: string[]; minPrice: number | null; maxPrice: number | null },
): boolean {
  if (filters.q) {
    const needle = filters.q.toLowerCase()
    const haystack = `${nft.name} ${nft.collection} ${nft.creator}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  if (filters.categories.length && !filters.categories.includes(nft.category)) return false
  if (filters.network.length && !filters.network.includes(nft.network)) return false
  const price = Number(nft.priceEth)
  if (filters.minPrice != null && price < filters.minPrice) return false
  if (filters.maxPrice != null && price > filters.maxPrice) return false
  return true
}

function sortNfts(nfts: Nft[], sort: SortOption): Nft[] {
  const copy = [...nfts]
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => Number(a.priceEth) - Number(b.priceEth))
    case 'price_desc':
      return copy.sort((a, b) => Number(b.priceEth) - Number(a.priceEth))
    case 'trending':
      return copy.sort((a, b) => b.reviewsCount * b.rating - a.reviewsCount * a.rating)
    case 'recent':
    default:
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
}

export const nftHandlers = [
  http.get('/api/nfts', async ({ request }) => {
    await applyNetworkDelay()
    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }
    const forcedError = maybeServerError()
    if (forcedError) return errors.transient(forcedError)

    const url = new URL(request.url)
    const q = url.searchParams.get('q')
    const categories = url.searchParams.getAll('category') as NftCategory[]
    const network = url.searchParams.getAll('network') as Network[]
    const minPriceParam = url.searchParams.get('minPrice')
    const maxPriceParam = url.searchParams.get('maxPrice')
    const sort = (url.searchParams.get('sort') as SortOption) || 'recent'
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
    const pageSize = Math.min(24, Math.max(1, Number(url.searchParams.get('pageSize') || '9')))

    if (isScenario('empty-catalog')) {
      const body: Paginated<Nft> = { items: [], page, pageSize, total: 0, totalPages: 0 }
      return HttpResponse.json(body)
    }

    const db = await getDb()
    const filtered = db.nfts.filter((nft) =>
      matchesFilters(nft, {
        q,
        categories,
        network,
        minPrice: minPriceParam ? Number(minPriceParam) : null,
        maxPrice: maxPriceParam ? Number(maxPriceParam) : null,
      }),
    )
    const sorted = sortNfts(filtered, sort)
    const total = sorted.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const items = sorted.slice(start, start + pageSize)

    const body: Paginated<Nft> = { items, page, pageSize, total, totalPages }
    return HttpResponse.json(body)
  }),

  http.get('/api/nfts/:id', async ({ params }) => {
    await applyNetworkDelay()
    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }
    const db = await getDb()
    const nft = db.nfts.find((n) => n.id === params.id || n.slug === params.id)
    if (!nft) return errors.notFound('NFT não encontrado.')
    return HttpResponse.json(nft)
  }),

  http.get('/api/nfts/:id/related', async ({ params }) => {
    await applyNetworkDelay()
    const db = await getDb()
    const nft = db.nfts.find((n) => n.id === params.id)
    if (!nft) return errors.notFound('NFT não encontrado.')
    const related = db.nfts.filter((n) => n.id !== nft.id && n.collection === nft.collection).slice(0, 6)
    const fallback = related.length ? related : db.nfts.filter((n) => n.id !== nft.id).slice(0, 6)
    return HttpResponse.json({ items: fallback })
  }),
]
