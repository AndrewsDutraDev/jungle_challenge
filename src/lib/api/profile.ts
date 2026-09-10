import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeys } from '@/lib/query/keys'
import type { ChangePasswordPayload, UpdateProfilePayload, User } from '@/types/api'

export function useProfileQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<User>('/profile', { signal })
      return data
    },
    enabled,
  })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await apiClient.patch<User>('/profile', payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile(), data)
      queryClient.setQueryData(queryKeys.session(), (prev: { user: User; expiresAt: string } | null | undefined) =>
        prev ? { ...prev, user: data } : prev,
      )
    },
  })
}

export function useUpdateAvatarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (avatarUrl: string) => {
      const { data } = await apiClient.post<User>('/profile/avatar', { avatarUrl })
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile(), data)
      queryClient.setQueryData(queryKeys.session(), (prev: { user: User; expiresAt: string } | null | undefined) =>
        prev ? { ...prev, user: data } : prev,
      )
    },
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      await apiClient.post('/profile/password', payload)
    },
  })
}
