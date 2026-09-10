import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { UpsertWalletPayload, Wallet } from '@/types/api'

export function useWalletsQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.wallets(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<{ items: Wallet[] }>('/wallets', { signal })
      return data.items
    },
    enabled,
  })
}

export function useCreateWalletMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpsertWalletPayload) => {
      const { data } = await apiClient.post<Wallet>('/wallets', payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wallets() }),
  })
}

export function useUpdateWalletMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<UpsertWalletPayload> }) => {
      const { data } = await apiClient.patch<Wallet>(`/wallets/${id}`, payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wallets() }),
  })
}
