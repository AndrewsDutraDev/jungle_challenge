import { http, HttpResponse } from 'msw'
import { resetDb } from '../db'
import { errors } from '../respond'
import { resetScenarioRandom } from '../scenarios'
import { applyNftChange, replayEvent, resetRealtimeState } from '../socket'

const ETH_RE = /^\d+(\.\d{1,18})?$/

/**
 * Plano de controle dos mocks, usado pelo painel de cenários e pelos testes
 * Playwright. Não faz parte do contrato da aplicação — nenhuma tela chama
 * estas rotas. Elas agem "do lado do servidor" (banco + Socket.IO), então o
 * efeito chega à interface pelo mesmo caminho de produção: REST e
 * `socket.io-client`, nunca um setter de cache.
 */
export const metaHandlers = [
  /** Restaura o estado conhecido: banco, sequência pseudoaleatória dos cenários e histórico de eventos. */
  http.post('/api/mocks/reset', async () => {
    await resetDb()
    resetScenarioRandom()
    resetRealtimeState()
    return new HttpResponse(null, { status: 204 })
  }),

  /** Muda preço e/ou disponibilidade de um NFT num instante escolhido — grava no banco e emite `nft.updated`. */
  http.post('/api/mocks/nfts/:id', async ({ request, params }) => {
    const patch = (await request.json()) as { priceEth?: string; editionsAvailable?: number }
    const fields: Record<string, string> = {}
    if (patch.priceEth !== undefined && !ETH_RE.test(patch.priceEth)) {
      fields.priceEth = 'Use uma string decimal, ex.: "1.25".'
    }
    if (patch.editionsAvailable !== undefined && (!Number.isInteger(patch.editionsAvailable) || patch.editionsAvailable < 0)) {
      fields.editionsAvailable = 'Use um inteiro maior ou igual a zero.'
    }
    if (Object.keys(fields).length) return errors.validation('Alteração inválida.', fields)

    const event = await applyNftChange(String(params.id), patch)
    if (!event) return errors.notFound('NFT não encontrado.')
    return HttpResponse.json(event)
  }),

  /** Reenvia um evento já emitido, idêntico (mesmo `eventId` e `version`): entrega duplicada ou atrasada. */
  http.post('/api/mocks/events/:eventId/replay', ({ params }) => {
    const event = replayEvent(String(params.eventId))
    if (!event) return errors.notFound('Evento fora do histórico recente.')
    return HttpResponse.json(event)
  }),
]
