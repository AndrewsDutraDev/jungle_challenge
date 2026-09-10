import { http, HttpResponse } from 'msw'
import type { UpsertWalletPayload } from '@/types/api'
import { createId, getDb, saveDb } from '../db'
import { applyNetworkDelay } from '../scenarios'
import { errors } from '../respond'
import { resolveSession } from '../session'

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export const walletHandlers = [
  http.get('/api/wallets', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const db = await getDb()
    const items = db.wallets.filter((w) => w.userId === context.user.id)
    return HttpResponse.json({ items })
  }),

  http.post('/api/wallets', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const payload = (await request.json()) as UpsertWalletPayload
    const fields: Record<string, string> = {}
    if (!payload.address || !ADDRESS_RE.test(payload.address)) fields.address = 'Endereço de carteira inválido (formato 0x...).'
    if (!payload.provider) fields.walletProvider = 'Selecione uma carteira.'
    if (!payload.network) fields.network = 'Selecione uma rede.'
    if (Object.keys(fields).length) return errors.validation('Verifique os campos destacados.', fields)

    const db = await getDb()
    if (payload.role === 'primary') {
      for (const w of db.wallets) if (w.userId === context.user.id && w.role === 'primary') w.role = 'secondary'
    }

    const wallet = {
      id: createId('wallet'),
      userId: context.user.id,
      role: payload.role,
      provider: payload.provider,
      network: payload.network,
      address: payload.address,
      ensName: payload.ensName ?? null,
      connected: true,
      createdAt: new Date().toISOString(),
    }
    db.wallets.push(wallet)
    saveDb()
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.patch('/api/wallets/:id', async ({ request, params }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const payload = (await request.json()) as Partial<UpsertWalletPayload>
    const db = await getDb()
    const wallet = db.wallets.find((w) => w.id === params.id && w.userId === context.user.id)
    if (!wallet) return errors.notFound('Carteira não encontrada.')

    if (payload.address && !ADDRESS_RE.test(payload.address)) {
      return errors.validation('Endereço inválido.', { address: 'Endereço de carteira inválido (formato 0x...).' })
    }
    if (payload.role === 'primary') {
      for (const w of db.wallets) if (w.userId === context.user.id && w.id !== wallet.id) w.role = 'secondary'
    }

    Object.assign(wallet, payload)
    saveDb()
    return HttpResponse.json(wallet)
  }),
]
