import { http, HttpResponse } from 'msw'
import { getDb, saveDb } from '../db'
import { applyNetworkDelay, maybeFailConnection } from '../scenarios'
import { errors } from '../respond'
import { resolveSession } from '../session'

export const favoritesHandlers = [
  http.get('/api/favorites', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const db = await getDb()
    const favoriteIds = db.favorites.filter((f) => f.userId === context.user.id).map((f) => f.nftId)
    const items = db.nfts.filter((n) => favoriteIds.includes(n.id))
    return HttpResponse.json({ items })
  }),

  http.post('/api/favorites', async ({ request }) => {
    await applyNetworkDelay()
    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const { nftId } = (await request.json()) as { nftId: string }
    const db = await getDb()
    if (!db.nfts.some((n) => n.id === nftId)) return errors.notFound('NFT não encontrado.')

    if (!db.favorites.some((f) => f.userId === context.user.id && f.nftId === nftId)) {
      db.favorites.push({ userId: context.user.id, nftId, createdAt: new Date().toISOString() })
      saveDb()
    }
    return new HttpResponse(null, { status: 201 })
  }),

  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    await applyNetworkDelay()
    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const db = await getDb()
    db.favorites = db.favorites.filter((f) => !(f.userId === context.user.id && f.nftId === params.nftId))
    saveDb()
    return new HttpResponse(null, { status: 204 })
  }),
]
