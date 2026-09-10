import { http, HttpResponse } from 'msw'
import type { LoginPayload, Session, SignupPayload } from '@/types/api'
import { getDb, saveDb } from '../db'
import { hashPassword } from '../hash'
import { applyNetworkDelay, maybeFailConnection, maybeServerError } from '../scenarios'
import { errors } from '../respond'
import { createSession, destroySession, getBearerToken, getGuestIdHeader, resolveSession, toPublicUser } from '../session'
import { mergeGuestCartIntoUser } from './cart-shared'

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const authHandlers = [
  http.post('/api/auth/signup', async ({ request }) => {
    await applyNetworkDelay()
    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }
    const forcedError = maybeServerError()
    if (forcedError) return errors.transient(forcedError)

    const payload = (await request.json()) as SignupPayload
    const fields: Record<string, string> = {}
    if (!payload.username || payload.username.trim().length < 3) fields.username = 'Nome de usuário deve ter ao menos 3 caracteres.'
    if (!payload.email || !isEmail(payload.email)) fields.email = 'Informe um e-mail válido.'
    if (!payload.password || payload.password.length < 6) fields.password = 'Senha deve ter ao menos 6 caracteres.'
    if (Object.keys(fields).length) return errors.validation('Verifique os campos destacados.', fields)

    const db = await getDb()
    const emailTaken = db.users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())
    const usernameTaken = db.users.some((u) => u.username.toLowerCase() === payload.username.toLowerCase())
    if (emailTaken || usernameTaken) {
      return errors.conflict('Já existe uma conta com esses dados.', {
        ...(emailTaken ? { email: 'E-mail já cadastrado.' } : {}),
        ...(usernameTaken ? { username: 'Nome de usuário já em uso.' } : {}),
      })
    }

    const user = {
      id: `user_${Math.random().toString(36).slice(2, 10)}`,
      username: payload.username.trim(),
      displayName: payload.username.trim(),
      email: payload.email.trim().toLowerCase(),
      passwordHash: await hashPassword(payload.password),
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    saveDb()

    const session = await createSession(user.id)
    const guestId = getGuestIdHeader(request)
    if (guestId) await mergeGuestCartIntoUser(guestId, user.id)

    const body: Session & { token: string } = { user: toPublicUser(user), expiresAt: session.expiresAt, token: session.token }
    return HttpResponse.json(body, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    await applyNetworkDelay()
    try {
      maybeFailConnection()
    } catch {
      return HttpResponse.error()
    }
    const forcedError = maybeServerError()
    if (forcedError) return errors.transient(forcedError)

    const payload = (await request.json()) as LoginPayload
    if (!payload.email || !payload.password) {
      return errors.validation('Informe e-mail e senha.', {
        ...(payload.email ? {} : { email: 'Campo obrigatório.' }),
        ...(payload.password ? {} : { password: 'Campo obrigatório.' }),
      })
    }

    const db = await getDb()
    const user = db.users.find((u) => u.email.toLowerCase() === payload.email.trim().toLowerCase())
    const passwordHash = user ? await hashPassword(payload.password) : null
    if (!user || passwordHash !== user.passwordHash) {
      return errors.validation('E-mail ou senha inválidos.', { password: 'E-mail ou senha inválidos.' })
    }

    const session = await createSession(user.id)
    const guestId = getGuestIdHeader(request)
    if (guestId) await mergeGuestCartIntoUser(guestId, user.id)

    const body: Session & { token: string } = { user: toPublicUser(user), expiresAt: session.expiresAt, token: session.token }
    return HttpResponse.json(body)
  }),

  http.get('/api/auth/session', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized('Nenhuma sessão ativa.')
    const body: Session = { user: toPublicUser(context.user), expiresAt: context.session.expiresAt }
    return HttpResponse.json(body)
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await applyNetworkDelay()
    const token = getBearerToken(request)
    if (token) await destroySession(token)
    return new HttpResponse(null, { status: 204 })
  }),
]

export const seededCredentialsNote = 'ana@kurio.test / kurio123 · marcos@kurio.test / kurio123'
