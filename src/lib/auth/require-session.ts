import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { fetchSession } from '@/lib/api/auth'
import type { Session } from '@/types/api'

/**
 * Guarda de rota para fluxos privados (checkout, perfil, carteiras).
 * Preserva o destino em `?redirect=` para retomar após o login.
 */
export async function requireSession(queryClient: QueryClient, href: string): Promise<Session> {
  const session = await queryClient.ensureQueryData({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => fetchSession(signal),
    staleTime: 60_000,
  })

  if (!session) {
    throw redirect({ to: '/login', search: { redirect: href } })
  }

  return session
}
