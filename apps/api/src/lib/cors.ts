import type { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'

// rawOrigins: comma-separated (book. + admin. hosts). Unset → no cross-origin access (web proxies /api same-origin).
export async function registerCors(app: FastifyInstance, rawOrigins: string | undefined) {
	const allowedOrigins = rawOrigins?.split(',').map((o) => o.trim()) ?? []

	await app.register(fastifyCors, {
		origin: allowedOrigins.length ? allowedOrigins : false,
		credentials: true,
	})

	// CSRF: cookie auth + unsafe method → Origin (when sent) must be a configured web origin.
	app.addHook('onRequest', async (request, reply) => {
		const origin = request.headers.origin
		if (allowedOrigins.length && origin && !allowedOrigins.includes(origin) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
			return reply.status(403).send({ error: 'ERR_FORBIDDEN', message: 'origin not allowed' })
		}
	})
}
