import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import { prisma } from './db'
import { registerErrorHandler } from './lib/middleware'
import { registerPublicVenueRoutes } from './routes/public/venues'
import { registerStaffRoutes } from './routes/staff'
import { registerPublicReservationRoutes } from './routes/public/reservations'
import { registerStaffAuthRoutes } from './routes/staff/auth'

const app = Fastify({ logger: true })

await app.register(fastifyCors, {
	origin: process.env.CORS_ORIGIN ?? true,
	credentials: true,
})

await app.register(fastifyCookie)

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
