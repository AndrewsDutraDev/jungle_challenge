import { HttpResponse } from 'msw'
import type { ApiErrorBody } from '@/types/api'

export function apiError(status: number, code: ApiErrorBody['error']['code'], message: string, fields?: Record<string, string>) {
  const body: ApiErrorBody = { error: { code, message, fields } }
  return HttpResponse.json(body, { status })
}

export const errors = {
  validation: (message: string, fields?: Record<string, string>) => apiError(400, 'VALIDATION_ERROR', message, fields),
  unauthorized: (message = 'Autenticação necessária.') => apiError(401, 'UNAUTHORIZED', message),
  sessionExpired: (message = 'Sua sessão expirou. Faça login novamente.') => apiError(401, 'SESSION_EXPIRED', message),
  forbidden: (message = 'Você não tem permissão para esta ação.') => apiError(403, 'FORBIDDEN', message),
  notFound: (message = 'Recurso não encontrado.') => apiError(404, 'NOT_FOUND', message),
  conflict: (message: string, fields?: Record<string, string>) => apiError(409, 'CONFLICT', message, fields),
  availabilityConflict: (message = 'Disponibilidade insuficiente para este NFT.') =>
    apiError(409, 'AVAILABILITY_CONFLICT', message),
  transient: (status: number) => apiError(status, 'TRANSIENT_FAILURE', 'Falha temporária no servidor. Tente novamente.'),
  idempotencyMismatch: () =>
    apiError(409, 'IDEMPOTENCY_MISMATCH', 'A chave de idempotência já foi usada com um pedido diferente.'),
}
