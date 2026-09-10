import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { Cart } from '@/types/api'

export function useCartQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cart(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Cart>('/cart', { signal })
      return data
    },
    enabled,
    staleTime: 5_000,
  })
}

function invalidateCartAndQuote(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
  queryClient.invalidateQueries({ queryKey: queryKeys.quote() })
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, quantity }: { nftId: string; quantity: number }) => {
      const { data } = await apiClient.post<Cart>('/cart/items', { nftId, quantity })
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(), data)
      invalidateCartAndQuote(queryClient)
    },
  })
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ nftId, quantity }: { nftId: string; quantity: number }) => {
      const { data } = await apiClient.patch<Cart>(`/cart/items/${nftId}`, { quantity })
      return data
    },
    onMutate: async ({ nftId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() })
      const previous = queryClient.getQueryData<Cart>(queryKeys.cart())
      if (previous) {
        queryClient.setQueryData<Cart>(queryKeys.cart(), {
          ...previous,
          items: previous.items.map((i) => (i.nftId === nftId ? { ...i, quantity } : i)),
        })
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.cart(), ctx.previous)
    },
    onSettled: () => invalidateCartAndQuote(queryClient),
  })
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nftId: string) => {
      const { data } = await apiClient.delete<Cart>(`/cart/items/${nftId}`)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(), data)
      invalidateCartAndQuote(queryClient)
    },
  })
}

export function useApplyCouponMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await apiClient.post<Cart>('/cart/coupon', { code })
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(), data)
      invalidateCartAndQuote(queryClient)
    },
  })
}

export function useRemoveCouponMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.delete<Cart>('/cart/coupon')
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(), data)
      invalidateCartAndQuote(queryClient)
    },
  })
}
