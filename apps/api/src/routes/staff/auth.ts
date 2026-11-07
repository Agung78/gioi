import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { verify } from '@node-rs/argon2'
import { unauthorized } from '../../lib/errors'
import { createSession, setSessionCookie, clearSessionCookie, validateSession } from '../../lib/auth'

export function registerStaffAuthRoutes(app: FastifyInstance, prisma: PrismaClient): void {
	app.post(
		'/staff/login',
		{
			schema: {
				body: {
					type: 'object',
					required: ['login', 'password'],
					properties: { login: { type: 'string' }, password: { type: 'string' } },
				},
			},
		},
		async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
			const { login, password } = request.body
			const user = await prisma.user.findFirst({ where: { login: login.toLowerCase() } })
			if (!user || !user.active) throw unauthorized('invalid credentials')

			const valid = await verifyPassword(user.passwordHash, password)
			if (!valid) throw unauthorized('invalid credentials')

			const venues = await prisma.userVenue.findMany({ where: { userId: user.id } })
			const token = await createSession(prisma, user.id, venues.map((v: { venueId: string }) => v.venueId))

			await prisma.user.update({
				where: { id: user.id },
				data: { lastLoginAt: new Date() },
			})

			setSessionCookie(reply, token)
			return { user: { id: user.id, name: user.name, login: user.login, isSuperAdmin: user.isSuperAdmin } }
		},
	)

	app.post('/staff/logout', async (request: FastifyRequest, reply: FastifyReply) => {
		const token = request.cookies['gioi_session']
		if (token) {
			try {
				await prisma.session.delete({ where: { tokenHash: token } })
			} catch {
				// ignore
			}
		}
		clearSessionCookie(reply)
		return { ok: true }
	})

	app.get('/staff/me', async (request: FastifyRequest, reply: FastifyReply) => {
		const token = request.cookies['gioi_session']
		if (!token) throw unauthorized('no session')
		const session = await validateSession(prisma, token)
		if (!session) throw unauthorized('invalid session')
		return { user: session.user }
	})
}

interface LoginBody {
	login: string
	password: string
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
	try {
		return await verify(hash, password)
	} catch {
		return false
	}
}
