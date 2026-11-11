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
import { registerStaffRoutes } from '../../routes/staff'
import { registerFloorPlanRoutes } from '../../routes/staff/floorPlan'
import { localDate, localTime } from '@gioi/domain'

const DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://gioi_app:password@localhost:5432/gioi_test'
const ADMIN_URL = process.env.TEST_ADMIN_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gioi_test?sslmode=disable'

// Reservations must be in the future; a fixed date goes stale.
const DATE = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

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
	registerStaffRoutes(app, prisma)
	registerFloorPlanRoutes(app, prisma)

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
		const res = await fetch(`${baseUrl}/public/venues/bali/availability?date=${DATE}&party=2`)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.date).toBe(DATE)
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
				email: 'ayu@example.com',
				date: DATE,
				time: '13:00',
				partySize: 2,
				idempotencyKey: '11111111-1111-4111-8111-111111111111',
			}),
		})
		expect(res.status).toBe(201)
		const body = await res.json()
		expect(body.bookingCode).toMatch(/^GIOI-/)
	})

	it('public booking stores a marketing source and rejects staff channels', async () => {
		const post = (source: string, key: string) =>
			fetch(`${baseUrl}/public/venues/bali/reservations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ guestName: 'Ayu', phone: '+62 811 222 333', email: 'ayu@example.com', date: DATE, time: '13:00', partySize: 2, source, idempotencyKey: key }),
			})
		const ok = await post('instagram', '33333333-3333-4333-8333-333333333333')
		expect(ok.status).toBe(201)
		const row = await prisma.reservation.findUnique({ where: { id: (await ok.json()).reservationId } })
		expect(row?.source).toBe('instagram')
		expect((await post('host', '44444444-4444-4444-8444-444444444444')).status).toBe(400)
	})

	it('POST idempotency returns the same booking', async () => {
		const booking = {
			guestName: 'Ayu',
			phone: '+62 811 222 333',
			email: 'ayu@example.com',
			date: DATE,
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
				email: 'ayu@example.com',
				date: DATE,
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
					email: `guest${i}@example.com`,
					date: DATE,
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
				startsAt: new Date(`${DATE}T06:00:00Z`), // 14:00 Asia/Makassar (UTC+8)
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
				email: 'ayu@example.com',
				date: DATE,
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
				email: 'ayu@example.com',
				date: DATE,
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

	it('venue admin saves a layout with areas; capacity is the seat count and unsent areas are deleted', async () => {
		const venue = await prisma.venue.findUnique({ where: { slug: 'bali' } })
		const area = await prisma.seatingArea.findFirst({ where: { venueId: venue!.id, name: 'Main Hall' } })

		await prisma.user.create({
			data: {
				name: 'Venue Admin',
				login: 'venueadmin',
				passwordHash: await hash('pw-12345'),
				active: true,
				venues: { create: { venueId: venue!.id, role: 'admin' } },
			},
		})

		const r = await fetch(`${baseUrl}/staff/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login: 'venueadmin', password: 'pw-12345' }),
		})
		expect(r.status).toBe(200)
		const cookie = r.headers.get('set-cookie')!.split(';')[0]

		const newId = '0199aaaa-0000-7000-8000-000000000001'
		const put = await fetch(`${baseUrl}/admin/venues/${venue!.id}/floor-plan/layout`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', cookie },
			body: JSON.stringify({
				areas: [
					{ id: area!.id, name: 'Main Hall', bookable: true, minParty: null, maxParty: 8 },
					{ id: newId, name: 'Rooftop', bookable: true, minParty: 2, maxParty: null },
				],
				tables: [
					{ seatingAreaId: area!.id, seats: 4, x: 100, y: 100, rotation: 0 },
					{ seatingAreaId: area!.id, seats: 6, x: 300, y: 100, rotation: 0 },
				],
				objects: [],
			}),
		})
		expect(put.status, await put.clone().text()).toBe(200)
		const plan = await put.json()
		expect(plan.areas.map((a: { name: string }) => a.name).sort()).toEqual(['Main Hall', 'Rooftop'])

		const rows = await prisma.seatingArea.findMany({ where: { venueId: venue!.id } })
		expect(rows.find((a) => a.id === area!.id)).toMatchObject({ capacity: 10, maxParty: 8 })
		expect(rows.find((a) => a.id === newId)).toMatchObject({ capacity: 0, minParty: 2 })
		expect(rows).toHaveLength(2) // every other seeded area was not sent, so it is gone

		// A table pointing at an area that was not sent is rejected.
		const bad = await fetch(`${baseUrl}/admin/venues/${venue!.id}/floor-plan/layout`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', cookie },
			body: JSON.stringify({
				areas: [{ id: area!.id, name: 'Main Hall', bookable: true }],
				tables: [{ seatingAreaId: newId, seats: 2, x: 10, y: 10, rotation: 0 }],
				objects: [],
			}),
		})
		expect(bad.status).toBe(422)
	})

	it('super admin without a user_venues row for the venue cannot save a layout', async () => {
		const venue = await prisma.venue.findUnique({ where: { slug: 'bali' } })

		// Super admin with NO user_venues row for this venue.
		await prisma.user.create({
			data: {
				name: 'Super Admin',
				login: 'superadmin',
				passwordHash: await hash('pw-12345'),
				active: true,
				isSuperAdmin: true,
			},
		})

		const r = await fetch(`${baseUrl}/staff/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login: 'superadmin', password: 'pw-12345' }),
		})
		expect(r.status).toBe(200)
		const cookie = r.headers.get('set-cookie')!.split(';')[0]

		const put = await fetch(`${baseUrl}/admin/venues/${venue!.id}/floor-plan/layout`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', cookie },
			body: JSON.stringify({ areas: [], tables: [], objects: [] }),
		})
		expect(put.status).toBe(403)
	})

	it('booking with explicit area below minParty gets 422', async () => {
		const venue = await prisma.venue.findUnique({ where: { slug: 'bali' } })
		const smallArea = await prisma.seatingArea.create({
			data: { venueId: venue!.id, name: 'Chef\'s Counter', capacity: 6, bookable: true, maxParty: 4 },
		})

		const res = await fetch(`${baseUrl}/public/venues/bali/reservations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				guestName: 'Ayu',
				phone: '+62 811 222 333',
				email: 'ayu@example.com',
				date: DATE,
				time: '13:00',
				partySize: 5,
				seatingAreaId: smallArea.id,
			}),
		})
		expect(res.status).toBe(422)
		const body = await res.json()
		expect(body.message).toBe('party size not allowed in this area')
	})

	it('reservations hold a floor table: taken, freed by time/cancel, too small, auto-assign, layout save keeps ids', async () => {
		const venue = (await prisma.venue.findUnique({ where: { slug: 'bali' } }))!
		const terrace = (await prisma.seatingArea.findFirst({ where: { venueId: venue.id, name: 'Terrace' } }))!
		const table = (seats: number) => prisma.floorTable.create({ data: { venueId: venue.id, seatingAreaId: areaIds[0], seats, x: 100, y: 100 } })
		const two = await table(2)
		const four = await table(4)

		const book = (time: string, partySize: number, extra: Record<string, unknown> = {}) =>
			fetch(`${baseUrl}/public/venues/bali/reservations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ guestName: 'Ayu', phone: '+62 811 222 333', email: 'ayu@example.com', date: DATE, time, partySize, ...extra }),
			})
		const unavailable = async (time: string, partySize: number) =>
			(await (await fetch(`${baseUrl}/public/venues/bali/table-availability?date=${DATE}&time=${time}&partySize=${partySize}`)).json()).unavailableTableIds.sort()
		const tableOf = async (id: string) => {
			const rows = await prisma.reservationTable.findMany({ where: { reservationId: id }, select: { tableId: true }, orderBy: { tableId: 'asc' } })
			return rows.map((r) => r.tableId)
		}

		// Free tables; a 3-top party cannot use the 2-seater.
		expect(await unavailable('13:00', 2)).toEqual([])
		expect(await unavailable('13:00', 3)).toEqual([two.id])

		// Explicit table: stored with its area; the same table at the same time is taken.
		const first = await book('13:00', 2, { tableIds: [four.id] })
		expect(first.status).toBe(201)
		const { reservationId, bookingCode } = await first.json()
		expect(await tableOf(reservationId)).toEqual([four.id])
		const res = await prisma.reservation.findUnique({ where: { id: reservationId } })
		expect(res!.seatingAreaId).toBe(areaIds[0])
		expect((await book('14:00', 2, { tableIds: [four.id] })).status).toBe(409)
		expect(await unavailable('14:00', 2)).toEqual([four.id])

		// A staff walk-in hits the same rule.
		await prisma.user.create({
			data: { name: 'Admin', login: 'tableadmin', passwordHash: await hash('pw-12345'), active: true, venues: { create: { venueId: venue.id, role: 'admin' } } },
		})
		const login = await fetch(`${baseUrl}/staff/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login: 'tableadmin', password: 'pw-12345' }),
		})
		const cookie = login.headers.get('set-cookie')!.split(';')[0]
		const walkIn = (tableId: string) =>
			fetch(`${baseUrl}/staff/reservations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', cookie },
				body: JSON.stringify({ guestName: 'Walk', date: DATE, time: '13:00', partySize: 2, source: 'walk_in', tableIds: [tableId] }),
			})
		expect((await walkIn(four.id)).status).toBe(409)

		// Free again after the window passes or the holder cancels.
		expect(await unavailable('16:00', 2)).toEqual([])
		expect((await fetch(`${baseUrl}/public/reservations/${bookingCode}/cancel`, { method: 'POST' })).status).toBe(200)
		expect(await unavailable('13:00', 2)).toEqual([])
		expect((await walkIn(four.id)).status).toBe(200)

		// Validation: table too small, table outside the requested area.
		expect((await book('19:00', 3, { tableIds: [two.id] })).status).toBe(422)
		expect((await book('19:00', 2, { tableIds: [four.id], seatingAreaId: terrace.id })).status).toBe(422)

		// Auto-assign (in the tables' area): smallest free fitting table; none left means no table but still booked.
		const inHall = { seatingAreaId: areaIds[0] }
		const a = await (await book('19:00', 3, inHall)).json()
		expect(await tableOf(a.reservationId)).toEqual([four.id])
		const b = await book('19:00', 3, inHall)
		expect(b.status).toBe(201)
		expect(await tableOf((await b.json()).reservationId)).toEqual([])
		const c = await (await book('19:00', 1, inHall)).json()
		expect(await tableOf(c.reservationId)).toEqual([two.id])

		// Layout save upserts by id: `four` keeps its id and its reservations, unsent `two` is deleted and released.
		const put = await fetch(`${baseUrl}/admin/venues/${venue.id}/floor-plan/layout`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', cookie },
			body: JSON.stringify({
				areas: [
					{ id: areaIds[0], name: 'Main Hall', bookable: true },
					{ id: terrace.id, name: 'Terrace', bookable: true },
				],
				tables: [
					{ id: four.id, seatingAreaId: areaIds[0], seats: 4, x: 200, y: 200, rotation: 0 },
					{ seatingAreaId: terrace.id, seats: 2, x: 300, y: 300, rotation: 0 },
				],
				objects: [],
			}),
		})
		expect(put.status, await put.clone().text()).toBe(200)
		expect(await tableOf(a.reservationId)).toEqual([four.id])
		expect(await tableOf(c.reservationId)).toEqual([])
		expect(await prisma.floorTable.findUnique({ where: { id: four.id } })).toMatchObject({ x: 200, y: 200 })
		expect(await prisma.floorTable.count({ where: { venueId: venue.id } })).toBe(2)
	})

	it('walk-ins take over late table holders only; staff can move a reservation to another table', async () => {
		const venue = (await prisma.venue.findUnique({ where: { slug: 'bali' } }))!
		await prisma.openingHours.updateMany({ where: { venueId: venue.id }, data: { closeMinute: 1440 } })
		const [a, b, c] = await Promise.all([1, 2, 3].map(() => prisma.floorTable.create({ data: { venueId: venue.id, seatingAreaId: areaIds[0], seats: 4, x: 100, y: 100 } })))
		const guest = await prisma.guest.create({ data: { venueId: venue.id, fullName: 'Late Guest', phone: '+62 811 000 111' } })
		let n = 0
		const hold = (tableId: string, minutesAgo: number, status: 'confirmed' | 'arrived') =>
			prisma.reservation.create({
				data: { venueId: venue.id, bookingCode: `TO${++n}`, guestId: guest.id, seatingAreaId: areaIds[0], tables: { create: [{ tableId }] }, startsAt: new Date(Date.now() - minutesAgo * 60000), partySize: 2, source: 'website', status },
			})
		const statusOf = async (id: string) => (await prisma.reservation.findUnique({ where: { id } }))!.status
		const tableOf = async (id: string) => {
			const rows = await prisma.reservationTable.findMany({ where: { reservationId: id }, select: { tableId: true }, orderBy: { tableId: 'asc' } })
			return rows.map((r) => r.tableId)
		}

		await prisma.user.create({
			data: { name: 'Host', login: 'takeoverhost', passwordHash: await hash('pw-12345'), active: true, venues: { create: { venueId: venue.id, role: 'host' } } },
		})
		const login = await fetch(`${baseUrl}/staff/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login: 'takeoverhost', password: 'pw-12345' }),
		})
		const cookie = login.headers.get('set-cookie')!.split(';')[0]
		const send = (method: string, path: string, body: unknown) =>
			fetch(`${baseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) })
		const now = new Date()
		const walkIn = (tableId: string, takeOver?: boolean) =>
			send('POST', '/staff/reservations', { guestName: 'Walk', date: localDate(now, venue.timeZone), time: localTime(now, venue.timeZone), partySize: 2, source: 'walk_in', tableIds: [tableId], takeOver })
		const states = async () =>
			(await (await fetch(`${baseUrl}/admin/venues/${venue.id}/table-availability?date=${localDate(now, venue.timeZone)}&time=${localTime(now, venue.timeZone)}&partySize=2`, { headers: { cookie } })).json()).tables

		// Late (confirmed, 30 min past start > 15 min grace): shown as late, taken over only with takeOver.
		const late = await hold(a.id, 30, 'confirmed')
		expect(await states()).toMatchObject([{ tableId: a.id, reason: 'late', holder: { reservationId: late.id, guestName: 'Late Guest', status: 'confirmed' } }])
		expect((await walkIn(a.id)).status).toBe(409)
		expect(await statusOf(late.id)).toBe('confirmed')
		const taken = await walkIn(a.id, true)
		expect(taken.status).toBe(200)
		expect(await statusOf(late.id)).toBe('no_show')
		const walk = await prisma.reservation.findUnique({ where: { id: (await taken.json()).reservationId } })
		expect(await tableOf(walk!.id)).toEqual([a.id])
		expect((await taken.json()).status).toBe('pending')
		expect(await prisma.reservationStatusEvent.findFirst({ where: { reservationId: late.id, toStatus: 'no_show' } })).toMatchObject({ fromStatus: 'confirmed', reason: 'table taken over by walk-in' })

		// Within grace, or already arrived: never overridable (the walk-in on `a` is itself within grace).
		expect((await walkIn(a.id, true)).status).toBe(409)
		const arrived = await hold(b.id, 30, 'arrived')
		expect((await walkIn(b.id, true)).status).toBe(409)
		const held = await states()
		expect(held).toHaveLength(2)
		expect(held.find((t: { tableId: string }) => t.tableId === a.id)).toMatchObject({ reason: 'held' })
		expect(held.find((t: { tableId: string }) => t.tableId === b.id)).toMatchObject({ reason: 'held', holder: { status: 'arrived' } })

		// Staff moves reservations: onto a free table, and into the table the first one just freed; a held table is refused.
		expect((await send('PATCH', `/staff/reservations/${arrived.id}`, { tableIds: [c.id] })).status).toBe(200)
		expect(await tableOf(arrived.id)).toEqual([c.id])
		const resArrived = await prisma.reservation.findUnique({ where: { id: arrived.id } })
		expect(resArrived!.seatingAreaId).toBe(areaIds[0])
		expect((await send('PATCH', `/staff/reservations/${walk!.id}`, { tableIds: [b.id] })).status).toBe(200)
		expect(await tableOf(walk!.id)).toEqual([b.id])
		expect((await send('PATCH', `/staff/reservations/${arrived.id}`, { tableIds: [b.id] })).status).toBe(409)

		// Resizing the party past the table's seats re-validates the kept table; a fitting size is fine.
		expect((await send('PATCH', `/staff/reservations/${walk!.id}`, { partySize: 5 })).status).toBe(409)
		expect((await send('PATCH', `/staff/reservations/${walk!.id}`, { partySize: 3 })).status).toBe(200)
	})

	it('staff can seat one party on several tables: SUM(seats) covers party, mixed areas rejected', async () => {
		const venue = (await prisma.venue.findUnique({ where: { slug: 'bali' } }))!
		const terrace = (await prisma.seatingArea.findFirst({ where: { venueId: venue.id, name: 'Terrace' } }))!
		const [t1, t2] = await Promise.all([
			prisma.floorTable.create({ data: { venueId: venue.id, seatingAreaId: areaIds[0], seats: 4, x: 100, y: 100 } }),
			prisma.floorTable.create({ data: { venueId: venue.id, seatingAreaId: areaIds[0], seats: 4, x: 200, y: 100 } }),
		])
		const u1 = await prisma.floorTable.create({ data: { venueId: venue.id, seatingAreaId: terrace.id, seats: 4, x: 100, y: 100 } })
		const small1 = await prisma.floorTable.create({ data: { venueId: venue.id, seatingAreaId: areaIds[0], seats: 2, x: 300, y: 100 } })

		await prisma.user.create({
			data: { name: 'Admin', login: 'multitableadmin', passwordHash: await hash('pw-12345'), active: true, venues: { create: { venueId: venue.id, role: 'admin' } } },
		})
		const login = await fetch(`${baseUrl}/staff/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login: 'multitableadmin', password: 'pw-12345' }),
		})
		const cookie = login.headers.get('set-cookie')!.split(';')[0]
		const send = (method: string, path: string, body: unknown) =>
			fetch(`${baseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) })

		// Two 4-seat tables for partySize 6: SUM=8 >= 6 -> 200, both held.
		const ok = await send('POST', '/staff/reservations', { guestName: 'Six', date: DATE, time: '13:00', partySize: 6, source: 'walk_in', tableIds: [t1.id, t2.id] })
		expect(ok.status).toBe(200)
		const { reservationId } = await ok.json()
		const rows = await prisma.reservationTable.findMany({ where: { reservationId }, select: { tableId: true } })
		expect(rows.map((r) => r.tableId).sort()).toEqual([t1.id, t2.id])
		const states = async () =>
			(await (await fetch(`${baseUrl}/admin/venues/${venue.id}/table-availability?date=${DATE}&time=13:00&partySize=2`, { headers: { cookie } })).json()).tables
		expect((await states()).find((t: { tableId: string }) => t.tableId === t1.id)!.reason).toBe('held')
		expect((await states()).find((t: { tableId: string }) => t.tableId === t2.id)!.reason).toBe('held')

		// Sum too small: one 2-seater for partySize 5 -> 422 'tables are too small'.
		expect((await send('POST', '/staff/reservations', { guestName: 'Five', date: DATE, time: '14:00', partySize: 5, source: 'walk_in', tableIds: [small1.id] })).status).toBe(422)

		// Tables from two different areas -> 422.
		expect((await send('POST', '/staff/reservations', { guestName: 'Split', date: DATE, time: '15:00', partySize: 2, source: 'walk_in', tableIds: [t1.id, u1.id] })).status).toBe(422)
	})
})