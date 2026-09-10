import axios, { AxiosError } from 'axios'
import type { ApiErrorBody } from '@/types/api'
import { getGuestId } from '@/mocks/db'
import { getAuthToken, clearAuthToken } from '@/lib/auth/token-store'

export const AXIOS_TIMEOUT_MS = 4500

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: AXIOS_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else {
    config.headers.set('X-Guest-Id', getGuestId())
  }
  return config
})

export class KurioApiError extends Error {
  readonly status: number
  readonly code: ApiErrorBody['error']['code']
  readonly fields?: Record<string, string>

  constructor(status: number, error: ApiErrorBody['error']) {
    super(error.message)
    this.name = 'KurioApiError'
    this.status = status
    this.code = error.code
    this.fields = error.fields
  }
}

export class NetworkFailureError extends Error {
  constructor() {
    super('Falha de conexão. Verifique sua internet e tente novamente.')
    this.name = 'NetworkFailureError'
  }
}

let sessionExpiredHandler: (() => void) | null = null
export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.data?.error) {
      const { status, data } = error.response
      if (data.error.code === 'SESSION_EXPIRED') {
        clearAuthToken()
        sessionExpiredHandler?.()
      }
      return Promise.reject(new KurioApiError(status, data.error))
    }
    return Promise.reject(new NetworkFailureError())
  },
)
