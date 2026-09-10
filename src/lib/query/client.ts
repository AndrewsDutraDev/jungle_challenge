import { QueryClient } from '@tanstack/react-query'
import { KurioApiError } from '@/lib/api/client'

/**
 * Política de cache/retry documentada:
 *  - staleTime padrão curto (10s) — os dados são "quase tempo real" e o
 *    próprio Socket.IO invalida quando algo muda de verdade;
 *  - não repete automaticamente erros 4xx (validação/permlicense) — só
 *    falhas transitórias (rede, 5xx) são reexecutadas, no máximo 2 vezes,
 *    com backoff exponencial curto;
 *  - refetchOnWindowFocus ligado para recursos privados (perfil, carteiras,
 *    pedidos) reconciliarem depois de o usuário voltar de outra aba.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof KurioApiError && error.status < 500 && error.status !== 429) return false
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
      },
      mutations: {
        retry: false,
      },
    },
  })
}
