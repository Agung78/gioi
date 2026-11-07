import type { FastifyInstance, FastifyError } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { AppError, unauthorized, forbidden } from './errors'
import { SESSION_COOKIE, validateSession, userRole, type AuthedSession } from './auth'

export function registerErrorHandler(app: FastifyInstance): void {
	app.setErrorHandler((error: FastifyError, _request, reply) => {
		if (error instanceof AppError) {
			return reply.status(error.statusCode).send({
				error: error.code,
				message: error.message,
			})
		}
		// Fastify schema validation and other framework client errors carry a 4xx statusCode.
		if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
			return reply.status(error.statusCode).send({ error: 'ERR_BAD_REQUEST', message: error.message })
		}
		app.log.error(error)
		return reply.status(500).send({ error: 'ERR_INTERNAL', message: 'internal server error' })
	})
}

export async function requireAuth(
	prisma: PrismaClient,
	cookies: Record<string, string>,
): Promise<AuthedSession> {
	const token = cookies[SESSION_COOKIE]
	if (!token) throw unauthorized('session required')
	const session = await validateSession(prisma, token)
	if (!session) throw unauthorized('invalid or expired session')
	return session
}

export function requireRole(role: string) {
	return (session: AuthedSession, venueId: string): void => {
		const r = userRole(session, venueId)
		if (!session.user.isSuperAdmin && r !== role) {
			throw forbidden('insufficient role')
		}
	}
}

export function requireVenueAccess(session: AuthedSession, venueId: string): void {
	if (!session.user.isSuperAdmin && !session.user.venueIds.includes(venueId)) {
		throw forbidden('venue not accessible')
	}
}
