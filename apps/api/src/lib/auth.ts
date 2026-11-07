import type { PrismaClient, UserVenue } from '@prisma/client'

import { sha256Hex } from './crypto'

export const SESSION_COOKIE = 'gioi_session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface AuthedSession {
	tokenHash: string
	userId: string
	user: {
		id: string
		name: string
		login: string
		isSuperAdmin: boolean
		active: boolean
		venueIds: string[]
		venueRoles: Record<string, string>
	}
}

export async function createSession(
	prisma: PrismaClient,
	userId: string,
	venueIds: string[],
): Promise<string> {
	const token = crypto.randomUUID().replace(/-/g, '')
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
	// Single active session per user: a new login revokes every earlier token.
	await prisma.$transaction([
		prisma.session.deleteMany({ where: { userId } }),
		prisma.session.create({ data: { tokenHash: sha256Hex(token), userId, expiresAt } }),
	])
	return token
}

export async function validateSession(
	prisma: PrismaClient,
	token: string,
): Promise<AuthedSession | null> {
	const session = await prisma.session.findUnique({
		where: { tokenHash: sha256Hex(token) },
		include: { user: { include: { venues: true } } },
	})
	if (!session) return null
	if (session.expiresAt < new Date()) return null
	if (!session.user.active) return null
	const venueRoles: Record<string, string> = {}
	for (const uv of session.user.venues as UserVenue[]) {
		venueRoles[uv.venueId] = uv.role
	}
	return {
		tokenHash: session.tokenHash,
		userId: session.userId,
		user: {
			id: session.user.id,
			name: session.user.name,
			login: session.user.login,
			isSuperAdmin: session.user.isSuperAdmin,
			active: session.user.active,
			venueIds: session.user.venues.map((uv: { venueId: string }) => uv.venueId),
			venueRoles,
		},
	}
}

export function userRole(session: AuthedSession, venueId: string): string {
	return session.user.venueRoles[venueId] ?? 'host'
}

export function setSessionCookie(reply: { setCookie: (name: string, value: string, opts: Record<string, unknown>) => void }, token: string): void {
	reply.setCookie(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_TTL_MS / 1000,
	})
}

export function clearSessionCookie(reply: { clearCookie: (name: string, opts: Record<string, unknown>) => void }): void {
	reply.clearCookie(SESSION_COOKIE, { path: '/' })
}
