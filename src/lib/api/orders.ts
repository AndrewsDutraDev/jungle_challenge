import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, NetworkFailureError } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { CreateOrderPayload, Order } from '@/types/api'
import { clearIdempotencyKey } from '@/lib/checkout/idempotency'

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { data } = await apiClient.post<Order>('/orders', payload, { timeout: 4200 })
      return data
    },
    retry: (failureCount, error) => {
      // Timeout do cliente (axios) vira NetworkFailureError — a mesma idempotencyKey
      // é reenviada pelo chamador via nova mutation, nunca automaticamente aqui,
      // para deixar a UI mostrar o estado de "tentando novamente".
      void failureCount
      void error
      return false
    },
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(order.id), order)
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
      queryClient.invalidateQueries({ queryKey: queryKeys.quote() })
      if (order.status !== 'pending') clearIdempotencyKey()
    },
  })
}

export function useOrderQuery(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ''),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Order>(`/orders/${orderId}`, { signal })
      return data
    },
    enabled: Boolean(orderId),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 1500 : false),
  })
}

export function isRecoverableNetworkError(error: unknown): boolean {
  return error instanceof NetworkFailureError
}
