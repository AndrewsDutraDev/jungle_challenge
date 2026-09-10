import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, KurioApiError } from './client'
import { queryKeys } from '@/lib/query/keys'
import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/auth/token-store'
import type { LoginPayload, Session, SignupPayload } from '@/types/api'

export async function fetchSession(signal?: AbortSignal): Promise<Session | null> {
  if (!getAuthToken()) return null
  try {
    const { data } = await apiClient.get<Session>('/auth/session', { signal })
    return data
  } catch (error) {
    if (error instanceof KurioApiError && (error.status === 401 || error.status === 404)) {
      clearAuthToken()
      return null
    }
    throw error
  }
}

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => fetchSession(signal),
    staleTime: 60_000,
    retry: false,
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post<Session & { token: string }>('/auth/login', payload)
      return data
    },
    onSuccess: (data) => {
      setAuthToken(data.token)
      queryClient.setQueryData(queryKeys.session(), { user: data.user, expiresAt: data.expiresAt })
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites() })
    },
  })
}

export function useSignupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SignupPayload) => {
      const { data } = await apiClient.post<Session & { token: string }>('/auth/signup', payload)
      return data
    },
    onSuccess: (data) => {
      setAuthToken(data.token)
      queryClient.setQueryData(queryKeys.session(), { user: data.user, expiresAt: data.expiresAt })
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
    },
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout')
    },
    onSettled: () => {
      clearAuthToken()
      // Limpa cache privado (favoritos, carrinho, pedidos, perfil, carteiras) para não vazar entre usuários.
      queryClient.setQueryData(queryKeys.session(), null)
      queryClient.removeQueries({ queryKey: queryKeys.favorites() })
      queryClient.removeQueries({ queryKey: queryKeys.cart() })
      queryClient.removeQueries({ queryKey: queryKeys.orders.all() })
      queryClient.removeQueries({ queryKey: queryKeys.profile() })
      queryClient.removeQueries({ queryKey: queryKeys.wallets() })
    },
  })
}
