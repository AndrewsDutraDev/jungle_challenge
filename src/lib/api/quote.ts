import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { Quote } from '@/types/api'

export function useQuoteQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.quote(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Quote>('/quote', { signal })
      return data
    },
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
