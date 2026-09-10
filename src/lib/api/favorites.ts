import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { Nft } from '@/types/api'

export function useFavoritesQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.favorites(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<{ items: Nft[] }>('/favorites', { signal })
      return data.items
    },
    enabled,
    staleTime: 15_000,
  })
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, isFavorite }: { nftId: string; isFavorite: boolean }) => {
      if (isFavorite) await apiClient.delete(`/favorites/${nftId}`)
      else await apiClient.post('/favorites', { nftId })
    },
    onMutate: async ({ nftId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites() })
      const previous = queryClient.getQueryData<Nft[]>(queryKeys.favorites())
      if (previous) {
        queryClient.setQueryData<Nft[]>(
          queryKeys.favorites(),
          isFavorite ? previous.filter((n) => n.id !== nftId) : previous,
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.favorites(), context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites() })
    },
  })
}
