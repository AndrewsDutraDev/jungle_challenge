import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { ExplorerTransaction } from '@/types/api'

/** Transação no explorador simulado. Confirmada, ela não muda mais — o cache não expira. */
export function useExplorerTransactionQuery(hash: string) {
  return useQuery({
    queryKey: queryKeys.explorerTransaction(hash),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ExplorerTransaction>(`/explorer/tx/${hash}`, { signal })
      return data
    },
    staleTime: Infinity,
  })
}
