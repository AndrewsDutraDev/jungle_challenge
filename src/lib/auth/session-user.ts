import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { Session } from '@/types/api'

export function decodeUserIdFromSession(queryClient: QueryClient): string | null {
  const session = queryClient.getQueryData<Session | null>(queryKeys.session())
  return session?.user.id ?? null
}
