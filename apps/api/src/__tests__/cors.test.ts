import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { registerCors } from '../lib/cors'

async function build(raw: string | undefined) {
	const app = Fastify()
	await registerCors(app, raw)
	app.get('/x', async () => ({ ok: true }))
	app.post('/x', async () => ({ ok: true }))
	return app
}

const ok = 'https://book.example.com'
const evil = 'https://evil.example.com'

describe('registerCors', () => {
	it('allowed origin gets ACAO + credentials', async () => {
		const res = await (await build(`${ok}, https://admin.example.com`)).inject({ method: 'GET', url: '/x', headers: { origin: ok } })
		expect(res.headers['access-control-allow-origin']).toBe(ok)
		expect(res.headers['access-control-allow-credentials']).toBe('true')
	})
	it('foreign origin gets no ACAO', async () => {
		const res = await (await build(ok)).inject({ method: 'GET', url: '/x', headers: { origin: evil } })
		expect(res.headers['access-control-allow-origin']).toBeUndefined()
	})
	it('foreign Origin POST is 403', async () => {
		const res = await (await build(ok)).inject({ method: 'POST', url: '/x', headers: { origin: evil } })
		expect(res.statusCode).toBe(403)
		expect(res.json()).toEqual({ error: 'ERR_FORBIDDEN', message: 'origin not allowed' })
	})
	it('allowed Origin and no Origin POST pass', async () => {
		const app = await build(ok)
		expect((await app.inject({ method: 'POST', url: '/x', headers: { origin: ok } })).statusCode).toBe(200)
		expect((await app.inject({ method: 'POST', url: '/x' })).statusCode).toBe(200)
	})
	it('unset env: no ACAO, CSRF inactive', async () => {
		const app = await build(undefined)
		const res = await app.inject({ method: 'GET', url: '/x', headers: { origin: ok } })
		expect(res.headers['access-control-allow-origin']).toBeUndefined()
		expect((await app.inject({ method: 'POST', url: '/x', headers: { origin: evil } })).statusCode).toBe(200)
	})
})
