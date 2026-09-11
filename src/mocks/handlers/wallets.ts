import { http, HttpResponse } from 'msw'
import type { UpsertWalletPayload, WalletConnectionResult } from '@/types/api'
import { createId, getDb, saveDb, type DbWallet } from '../db'
import { applyNetworkDelay, isScenario, maybeFailConnection, sleep } from '../scenarios'
import { errors } from '../respond'
import { resolveSession, type AuthContext } from '../session'

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

/** Tempo que a carteira simulada leva para "pedir aprovação" ao usuário. */
const WALLET_APPROVAL_MS = 600

/** Carteira do usuário da sessão — 404 se não existe, 403 se pertence a outra conta. */
async function findOwnWallet(context: AuthContext, walletId: string): Promise<DbWallet | Response> {
  const db = await getDb()
  const wallet = db.wallets.find((w) => w.id === walletId)
  if (!wallet) return errors.notFound('Carteira não encontrada.')
  if (wallet.userId !== context.user.id) return errors.forbidden('Esta carteira pertence a outra conta.')
  return wallet
}

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

    const wallet: DbWallet = {
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

    const wallet = await findOwnWallet(context, String(params.id))
    if (wallet instanceof Response) return wallet

    const payload = (await request.json()) as Partial<UpsertWalletPayload>
    if (payload.address && !ADDRESS_RE.test(payload.address)) {
      return errors.validation('Endereço inválido.', { address: 'Endereço de carteira inválido (formato 0x...).' })
    }
    const db = await getDb()
    if (payload.role === 'primary') {
      for (const w of db.wallets) if (w.userId === context.user.id && w.id !== wallet.id) w.role = 'secondary'
    }

    Object.assign(wallet, payload)
    saveDb()
    return HttpResponse.json(wallet)
  }),

  /**
   * Pede à carteira simulada que se conecte. A resposta demora o tempo de
   * "aprovação" e traz `declined` quando o usuário recusa na carteira
   * (cenário `wallet-declined`) — uma decisão do usuário, não um erro HTTP.
   */
  http.post('/api/wallets/:id/connect', async ({ request, params }) => {
    await applyNetworkDelay()
    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const wallet = await findOwnWallet(context, String(params.id))
    if (wallet instanceof Response) return wallet

    await sleep(WALLET_APPROVAL_MS)
    const declined = isScenario('wallet-declined')
    if (!declined) {
      wallet.connected = true
      saveDb()
    }
    const body: WalletConnectionResult = { status: declined ? 'declined' : 'connected', wallet }
    return HttpResponse.json(body)
  }),

  http.post('/api/wallets/:id/disconnect', async ({ request, params }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const wallet = await findOwnWallet(context, String(params.id))
    if (wallet instanceof Response) return wallet

    wallet.connected = false
    saveDb()
    return HttpResponse.json(wallet)
  }),
]
