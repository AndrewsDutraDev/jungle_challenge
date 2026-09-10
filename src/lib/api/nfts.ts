import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { Nft, NftFacets, NftListParams, Paginated } from '@/types/api'

type FacetParams = Omit<NftListParams, 'page' | 'pageSize' | 'sort'>

export async function fetchNftList(params: NftListParams, signal?: AbortSignal): Promise<Paginated<Nft>> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  for (const c of params.category ?? []) search.append('category', c)
  for (const n of params.network ?? []) search.append('network', n)
  if (params.minPrice != null) search.set('minPrice', String(params.minPrice))
  if (params.maxPrice != null) search.set('maxPrice', String(params.maxPrice))
  if (params.sort) search.set('sort', params.sort)
  search.set('page', String(params.page ?? 1))
  search.set('pageSize', String(params.pageSize ?? 9))

  const { data } = await apiClient.get<Paginated<Nft>>(`/nfts?${search.toString()}`, { signal })
  return data
}

export async function fetchNftFacets(params: FacetParams, signal?: AbortSignal): Promise<NftFacets> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  for (const c of params.category ?? []) search.append('category', c)
  for (const n of params.network ?? []) search.append('network', n)
  if (params.minPrice != null) search.set('minPrice', String(params.minPrice))
  if (params.maxPrice != null) search.set('maxPrice', String(params.maxPrice))

  const { data } = await apiClient.get<NftFacets>(`/nfts/facets?${search.toString()}`, { signal })
  return data
}

export async function fetchNftById(id: string, signal?: AbortSignal): Promise<Nft> {
  const { data } = await apiClient.get<Nft>(`/nfts/${id}`, { signal })
  return data
}

export async function fetchRelatedNfts(id: string, signal?: AbortSignal): Promise<{ items: Nft[] }> {
  const { data } = await apiClient.get<{ items: Nft[] }>(`/nfts/${id}/related`, { signal })
  return data
}

export function useNftListQuery(params: NftListParams) {
  return useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => fetchNftList(params, signal),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  })
}

export function useNftFacetsQuery(params: FacetParams) {
  return useQuery({
    queryKey: queryKeys.nfts.facets(params),
    queryFn: ({ signal }) => fetchNftFacets(params, signal),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  })
}

export function useNftQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(id ?? ''),
    queryFn: ({ signal }) => fetchNftById(id as string, signal),
    enabled: Boolean(id),
    staleTime: 15_000,
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 404) return false
      return failureCount < 2
    },
  })
}

export function useRelatedNftsQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nfts.related(id ?? ''),
    queryFn: ({ signal }) => fetchRelatedNfts(id as string, signal),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}
