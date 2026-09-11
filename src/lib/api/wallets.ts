import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { UpsertWalletPayload, Wallet, WalletConnectionResult } from '@/types/api'

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

function replaceWallet(queryClient: ReturnType<typeof useQueryClient>, wallet: Wallet) {
  queryClient.setQueryData<Wallet[]>(queryKeys.wallets(), (prev) => prev?.map((w) => (w.id === wallet.id ? wallet : w)))
}

/** Pede à carteira simulada que se conecte; `status: 'declined'` quando o usuário recusa. */
export function useConnectWalletMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await apiClient.post<WalletConnectionResult>(`/wallets/${walletId}/connect`)
      return data
    },
    onSuccess: (result) => replaceWallet(queryClient, result.wallet),
  })
}

export function useDisconnectWalletMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await apiClient.post<Wallet>(`/wallets/${walletId}/disconnect`)
      return data
    },
    onSuccess: (wallet) => replaceWallet(queryClient, wallet),
  })
}
