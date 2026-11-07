import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import { prisma } from './db'
import { registerErrorHandler } from './lib/middleware'
import { registerPublicVenueRoutes } from './routes/public/venues'
import { registerStaffRoutes } from './routes/staff'
import { registerPublicReservationRoutes } from './routes/public/reservations'
import { registerStaffAuthRoutes } from './routes/staff/auth'

const app = Fastify({ logger: true, trustProxy: !!process.env.VERCEL })

await app.register(fastifyCors, {
	origin: process.env.CORS_ORIGIN ?? true,
	credentials: true,
})

await app.register(fastifyCookie)

// CSRF: cookie auth + unsafe method → Origin (when sent) must be the configured web origin.
const allowedOrigin = process.env.CORS_ORIGIN
app.addHook('onRequest', async (request, reply) => {
	const origin = request.headers.origin
	if (allowedOrigin && origin && origin !== allowedOrigin && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
		return reply.status(403).send({ error: 'ERR_FORBIDDEN', message: 'origin not allowed' })
	}
})

registerErrorHandler(app)

app.get('/health', async () => {
	await prisma.$queryRaw`SELECT 1`
	return { status: 'ok' }
})

registerPublicVenueRoutes(app, prisma)
registerPublicReservationRoutes(app, prisma)
registerStaffAuthRoutes(app, prisma)
registerStaffRoutes(app, prisma)

// Vercel imports the default export; locally there is no platform to call it.
if (!process.env.VERCEL) {
	await app.listen({ port: Number(process.env.PORT ?? 3001), host: '127.0.0.1' })
}

export default app
