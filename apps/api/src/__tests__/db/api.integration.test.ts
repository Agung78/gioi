import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { hash } from '@node-rs/argon2'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'
import { registerPublicVenueRoutes } from '../../routes/public/venues'
import { registerPublicReservationRoutes } from '../../routes/public/reservations'
import { registerStaffAuthRoutes } from '../../routes/staff/auth'

const DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://gioi_app:password@localhost:5432/gioi_test'
const ADMIN_URL = process.env.TEST_ADMIN_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gioi_test?sslmode=disable'

interface BuiltApp {
	app: ReturnType<typeof Fastify>
	prisma: PrismaClient
}

function buildApp(): BuiltApp {
	const app = Fastify({ logger: false })
	const adapter = new PrismaPg({ connectionString: DATABASE_URL, max: 5 })
	const prisma = new PrismaClient({ adapter })

	app.register(fastifyCors, { origin: true, credentials: true })
	app.register(fastifyCookie)

	app.get('/health', async () => {
		await prisma.$queryRaw`SELECT 1`
		return { status: 'ok' }
	})

	registerPublicVenueRoutes(app, prisma)
	registerPublicReservationRoutes(app, prisma)
	registerStaffAuthRoutes(app, prisma)

	return { app, prisma }
}

describe('API integration', () => {
	let app: BuiltApp['app']
	let prisma: PrismaClient
	let baseUrl: string
	let areaIds: string[]
	// Superuser connection: gioi_app cannot delete history rows, so reset via TRUNCATE.
	let admin: PrismaClient

	beforeAll(async () => {
		const built = buildApp()
		app = built.app
		prisma = built.prisma
		await app.listen({ port: 0 })
		const server = app.server as { address(): { port: number } }
		const port = server.address().port
		baseUrl = `http://localhost:${port}`
		admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: ADMIN_URL, max: 1 }) })
	})

	afterAll(async () => {
		await app.close()
		await prisma.$disconnect()
		await admin.$disconnect()
	})

	beforeEach(async () => {
		await admin.$executeRawUnsafe('TRUNCATE venues, users CASCADE')

		const venue = await prisma.venue.create({
			data: {
				slug: 'bali',
				name: 'GIOI Ocean Gourmet',
				timeZone: 'Asia/Makassar',
				tagline: 't',
				intro: 'i',
				address: 'a',
				phone: '+62 811 3960 6101',
				whatsapp: '+62 811 3960 6101',
				email: 'e@x.com',
				mapsUrl: 'm',
				bookingIntervalMinutes: 30,
				partyMin: 1,
				partyMax: 8,
				leadTimeMinutes: 60,
				cutoffMinutes: 120,
				noShowTargetPercent: 8,
				overCapacityAlertPercent: 85,
				cancellationPolicy: 'p',
				feedbackMessageTemplate: 'm',
			},
		})

		await prisma.openingHours.createMany({
			data: Array.from({ length: 7 }, (_, i) => ({
				venueId: venue.id,
				weekday: i,
				openMinute: 600,
				closeMinute: 1320,
			})),
		})

		const mainHall = await prisma.seatingArea.create({
			data: { venueId: venue.id, name: "Main Hall", capacity: 24, bookable: true },
		})
		await prisma.seatingArea.create({
			data: { venueId: venue.id, name: "Terrace", capacity: 14, bookable: true, minParty: 2 },
		})

		areaIds = [mainHall.id]

	})

	it('GET /public/venues/:slug returns venue data', async () => {
		const res = await fetch(`${baseUrl}/public/venues/bali`)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.slug).toBe('bali')
		expect(body.timeZone).toBe('Asia/Makassar')
	})

	it('GET /public/venues/:slug/availability returns slots', async () => {
		const res = await fetch(`${baseUrl}/public/venues/bali/availability?date=2026-06-15&party=2`)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.date).toBe('2026-06-15')
		expect(Array.isArray(body.slots)).toBe(true)
		expect(body.slots.length).toBeGreaterThan(0)
	})

	it('POST /public/venues/:slug/reservations creates a booking', async () => {
		const res = await fetch(`${baseUrl}/public/venues/bali/reservations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				guestName: 'Ayu',
				phone: '+62 811 222 333',
				date: '2026-06-15',
				time: '13:00',
				partySize: 2,
				idempotencyKey: '11111111-1111-4111-8111-111111111111',
			}),
		})
		expect(res.status).toBe(201)
		const body = await res.json()
		expect(body.bookingCode).toMatch(/^GIOI-/)
	})

	it('POST idempotency returns the same booking', async () => {
		const booking = {
			guestName: 'Ayu',
			phone: '+62 811 222 333',
			date: '2026-06-15',
			time: '13:00',
			partySize: 2,
			idempotencyKey: '22222222-2222-4222-8222-222222222222',
		}
		const r1 = await fetch(`${baseUrl}/public/venues/bali/reservations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(booking),
		})
		const r2 = await fetch(`${baseUrl}/public/venues/bali/reservations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(booking),
		})
		const b1 = await r1.json()
		const b2 = await r2.json()
		expect(b1.bookingCode).toMatch(/^GIOI-/)
		expect(b2.bookingCode).toBe(b1.bookingCode)
	})

	it('unknown reservation code returns 404', async () => {
		const res = await fetch(`${baseUrl}/public/reservations/does-not-exist`)
		expect(res.status).toBe(404)
	})

	it('GET /public/reservations/:code excludes PII', async () => {
		const create = await fetch(`${baseUrl}/public/venues/bali/reservations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				guestName: 'Ayu',
				phone: '+62 811 222 333',
				date: '2026-06-15',
				time: '13:00',
				partySize: 2,
			}),
		})
		const { bookingCode } = await create.json()
		const res = await fetch(`${baseUrl}/public/reservations/${bookingCode}`)
		const body = await res.json()
		expect(body.phone).toBeUndefined()
		expect(body.allergies).toBeUndefined()
		expect(body.bookingCode).toBe(bookingCode)
	})

	it('concurrency: double booking under load does not exceed capacity', async () => {
		const areaId = areaIds[0]
		const capacity = 24
		const bookingCount = 30
		const partySize = 1

		const promises = Array.from({ length: bookingCount }, (_, i) =>
			fetch(`${baseUrl}/public/venues/bali/reservations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					guestName: `Guest ${i}`,
					phone: `+62 811 000 ${String(i).padStart(4, '0')}`,
					date: '2026-06-15',
					time: '14:00',
					partySize,
					seatingAreaId: areaId,
					idempotencyKey: crypto.randomUUID(),
				}),
			}),
		)

		const results = await Promise.all(promises)
		const created = results.filter((r) => r.status === 201).length
		expect(created).toBe(capacity)
		expect(results.filter((r) => r.status === 409).length).toBe(bookingCount - capacity)

		const total = await prisma.reservation.aggregate({
			where: {
				seatingAreaId: areaId,
				startsAt: new Date('2026-06-15T06:00:00Z'), // 14:00 Asia/Makassar (UTC+8)
				status: { in: ['pending', 'confirmed', 'arrived', 'seated'] },
			},
			_sum: { partySize: true },
		})
		expect(total._sum.partySize ?? 0).toBeLessThanOrEqual(capacity)
	})

	it('status transitions: reject invalid transition', async () => {
		const create = await fetch(`${baseUrl}/public/venues/bali/reservations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				guestName: 'Ayu',
				phone: '+62 811 222 333',
				date: '2026-06-15',
				time: '13:00',
				partySize: 2,
			}),
		})
		const { bookingCode } = await create.json()

		// Cannot cancel a pending reservation twice -> second cancel returns 409
		const r1 = await fetch(`${baseUrl}/public/reservations/${bookingCode}/cancel`, {
			method: 'POST',
		})
		expect(r1.status).toBe(200)

		const r2 = await fetch(`${baseUrl}/public/reservations/${bookingCode}/cancel`, {
			method: 'POST',
		})
		expect(r2.status).toBe(409)
	})

	it('feedback only allowed on completed reservation', async () => {
		const create = await fetch(`${baseUrl}/public/venues/bali/reservations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				guestName: 'Ayu',
				phone: '+62 811 222 333',
				date: '2026-06-15',
				time: '13:00',
				partySize: 2,
			}),
		})
		const { bookingCode } = await create.json()

		const res = await fetch(`${baseUrl}/public/reservations/${bookingCode}/feedback`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ rating: 5 }),
		})
		expect(res.status).toBe(409)
	})

	it('new login revokes the previous session (single device)', async () => {
		await prisma.user.create({ data: { name: 'Host', login: 'host1', passwordHash: await hash('pw-12345') } })
		const login = async () => {
			const r = await fetch(`${baseUrl}/staff/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ login: 'host1', password: 'pw-12345' }),
			})
			expect(r.status).toBe(200)
			return r.headers.get('set-cookie')!.split(';')[0]
		}
		const me = (cookie: string) => fetch(`${baseUrl}/staff/me`, { headers: { cookie } })

		const deviceA = await login()
		expect((await me(deviceA)).status).toBe(200)
		const deviceB = await login()
		expect((await me(deviceB)).status).toBe(200)
		expect((await me(deviceA)).status).toBe(401)
	})
})
