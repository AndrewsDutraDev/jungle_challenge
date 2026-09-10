import type { DbSession, DbUser } from './db'
import { getDb, saveDb, createId } from './db'
import { isScenario } from './scenarios'

const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutos

export async function createSession(userId: string): Promise<DbSession> {
  const db = await getDb()
  const session: DbSession = {
    token: createId('sess'),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  db.sessions = db.sessions.filter((s) => s.userId !== userId)
  db.sessions.push(session)
  saveDb()
  return session
}

export async function destroySession(token: string): Promise<void> {
  const db = await getDb()
  db.sessions = db.sessions.filter((s) => s.token !== token)
  saveDb()
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

export interface AuthContext {
  session: DbSession
  user: DbUser
}

/**
 * Resolve a sessão a partir do header Authorization.
 * Retorna `null` quando não há sessão válida (o chamador decide o erro certo:
 * 401 UNAUTHORIZED para rota sem tentativa de login, 401 SESSION_EXPIRED para
 * token expirado/cenário forçado).
 */
export async function resolveSession(request: Request): Promise<{ context: AuthContext | null; expired: boolean }> {
  const token = getBearerToken(request)
  if (!token) return { context: null, expired: false }

  const db = await getDb()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return { context: null, expired: false }

  const isExpired = isScenario('session-expired') || new Date(session.expiresAt).getTime() < Date.now()
  if (isExpired) {
    db.sessions = db.sessions.filter((s) => s.token !== token)
    saveDb()
    return { context: null, expired: true }
  }

  const user = db.users.find((u) => u.id === session.userId)
  if (!user) return { context: null, expired: false }

  return { context: { session, user }, expired: false }
}

export function getGuestIdHeader(request: Request): string | null {
  return request.headers.get('x-guest-id')
}

export function toPublicUser(user: DbUser) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  }
}
