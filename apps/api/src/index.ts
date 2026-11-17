import Fastify from 'fastify'
import { registerCors } from './lib/cors'
import fastifyCookie from '@fastify/cookie'
import { prisma } from './db'
import { registerErrorHandler } from './lib/middleware'
import { registerPublicVenueRoutes } from './routes/public/venues'
import { registerStaffRoutes } from './routes/staff'
import { registerFloorPlanRoutes } from './routes/staff/floorPlan'
import { registerPublicReservationRoutes } from './routes/public/reservations'
import { registerStaffAuthRoutes } from './routes/staff/auth'

const app = Fastify({ logger: true, trustProxy: !!process.env.VERCEL })

await registerCors(app, process.env.CORS_ORIGIN)

await app.register(fastifyCookie)

registerErrorHandler(app)

app.get('/health', async () => {
	// No DB query: uptime pings must not keep Neon compute awake (billed per CU-hour).
	return { status: 'ok' }
})

registerPublicVenueRoutes(app, prisma)
registerPublicReservationRoutes(app, prisma)
registerStaffAuthRoutes(app, prisma)
registerStaffRoutes(app, prisma)
registerFloorPlanRoutes(app, prisma)

// Vercel imports the default export; locally there is no platform to call it.
if (!process.env.VERCEL) {
	await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? '127.0.0.1' })
}

export default app
