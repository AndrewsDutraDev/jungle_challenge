import { http, HttpResponse } from 'msw'
import { applyNetworkDelay } from '../scenarios'
import { errors } from '../respond'
import { getOrCreateCart, resolveCartOwnerKey } from './cart-shared'
import { computeQuote } from './quote-shared'

export const quoteHandlers = [
  http.get('/api/quote', async ({ request }) => {
    await applyNetworkDelay()
    const resolved = await resolveCartOwnerKey(request)
    if (!resolved) return errors.unauthorized('Identificação de carrinho ausente.')
    if (resolved.expired) return errors.sessionExpired()

    const cart = await getOrCreateCart(resolved.ownerKey)
    const quote = await computeQuote(cart)
    return HttpResponse.json(quote)
  }),
]
