import { http, HttpResponse } from 'msw'
import type { ChangePasswordPayload, UpdateProfilePayload } from '@/types/api'
import { getDb, saveDb } from '../db'
import { hashPassword } from '../hash'
import { applyNetworkDelay } from '../scenarios'
import { errors } from '../respond'
import { resolveSession, toPublicUser } from '../session'

export const profileHandlers = [
  http.get('/api/profile', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()
    return HttpResponse.json(toPublicUser(context.user))
  }),

  http.patch('/api/profile', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const payload = (await request.json()) as UpdateProfilePayload
    const fields: Record<string, string> = {}
    if (!payload.displayName || payload.displayName.trim().length < 2) fields.displayName = 'Informe um nome de exibição válido.'
    if (!payload.username || payload.username.trim().length < 3) fields.username = 'Nome de usuário deve ter ao menos 3 caracteres.'
    if (Object.keys(fields).length) return errors.validation('Verifique os campos destacados.', fields)

    const db = await getDb()
    const usernameTaken = db.users.some((u) => u.id !== context.user.id && u.username.toLowerCase() === payload.username.toLowerCase())
    if (usernameTaken) return errors.conflict('Nome de usuário já em uso.', { username: 'Nome de usuário já em uso.' })

    context.user.displayName = payload.displayName.trim()
    context.user.username = payload.username.trim()
    saveDb()
    return HttpResponse.json(toPublicUser(context.user))
  }),

  http.post('/api/profile/avatar', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const { avatarUrl } = (await request.json()) as { avatarUrl: string }
    context.user.avatarUrl = avatarUrl
    saveDb()
    return HttpResponse.json(toPublicUser(context.user))
  }),

  http.post('/api/profile/password', async ({ request }) => {
    await applyNetworkDelay()
    const { context, expired } = await resolveSession(request)
    if (!context) return expired ? errors.sessionExpired() : errors.unauthorized()

    const payload = (await request.json()) as ChangePasswordPayload
    if (!payload.newPassword || payload.newPassword.length < 6) {
      return errors.validation('Nova senha deve ter ao menos 6 caracteres.', { newPassword: 'Senha muito curta.' })
    }
    const currentHash = await hashPassword(payload.currentPassword ?? '')
    if (currentHash !== context.user.passwordHash) {
      return errors.validation('Senha atual incorreta.', { currentPassword: 'Senha atual incorreta.' })
    }

    context.user.passwordHash = await hashPassword(payload.newPassword)
    saveDb()
    return new HttpResponse(null, { status: 204 })
  }),
]
