import { http, HttpResponse } from 'msw'
import { resetDb } from '../db'

/** Usado pelo painel de cenários e pelos testes Playwright para restaurar um estado conhecido. */
export const metaHandlers = [
  http.post('/api/mocks/reset', async () => {
    await resetDb()
    return new HttpResponse(null, { status: 204 })
  }),
]
