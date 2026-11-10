import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { notFound, conflict, unprocessable } from '../../lib/errors'
import { randomBookingCode } from '../../lib/crypto'
import { track } from '../../lib/analytics'
import { addDays, canTransition, dayOfWeek, localDate, localTime, toMinutes, toUtc } from '@gioi/domain'

interface CreateReservationBody {
	guestName: string
	phone: string
	email?: string
	date: string
	time: string
	partySize: number
	seatingAreaId?: string
	occasion?: string
	guestNotes?: string
	allergies?: string[]
	accessibility?: string
	idempotencyKey?: string
	source?: 'website' | 'instagram' | 'google' | 'whatsapp'
}

interface FeedbackBody {
	rating: number
	comments?: string
	serviceTags?: string[]
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'arrived', 'seated'] as const

export function registerPublicReservationRoutes(app: FastifyInstance, prisma: PrismaClient): void {
	app.post(
		'/public/venues/:slug/reservations',
		{
			schema: {
				params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
				body: {
					type: 'object',
					required: ['guestName', 'phone', 'email', 'date', 'time', 'partySize'],
					properties: {
						guestName: { type: 'string', maxLength: 120 },
						phone: { type: 'string', maxLength: 32 },
						email: { type: 'string', maxLength: 254 },
						date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
						time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
						partySize: { type: 'integer', minimum: 1 },
						seatingAreaId: { type: 'string', format: 'uuid' },
						occasion: { type: 'string', maxLength: 100 },
						guestNotes: { type: 'string', maxLength: 1000 },
						allergies: { type: 'array', maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 60 } },
						accessibility: { type: 'string', maxLength: 300 },
						idempotencyKey: { type: 'string', format: 'uuid' },
						// Guests may only claim marketing channels, never staff ones (host, walk_in, ...).
						source: { type: 'string', enum: ['website', 'instagram', 'google', 'whatsapp'] },
						website: { type: 'string', maxLength: 200 },
					},
				},
			},
		},
		async (request: FastifyRequest<{ Params: { slug: string }; Body: CreateReservationBody & { website?: string } }>, reply: FastifyReply) => {
			const { slug } = request.params
			const body = request.body

			// Honeypot: hidden field real users never fill. Fake success so bots don't adapt.
			if (body.website) return reply.status(200).send({ bookingCode: randomBookingCode(), reservationId: randomUUID() })

			const venue = await prisma.venue.findUnique({ where: { slug }, include: { openingHours: true, closedDates: true } })
			if (!venue) throw notFound('venue not found')

			if (body.idempotencyKey) {
				const existing = await prisma.reservation.findUnique({
					where: { idempotencyKey: body.idempotencyKey },
				})
				if (existing) return reply.status(200).send({ bookingCode: existing.bookingCode, reservationId: existing.id })
			}

			const startsAt = toUtc(body.date, body.time, venue.timeZone)

			// Server-side booking rules: the UI hides these via the slot grid, the API must enforce them.
			const weekday = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(dayOfWeek(body.date))
			const hours = venue.openingHours.find((oh) => oh.weekday === weekday)
			const minute = toMinutes(body.time)
			const diffMin = (startsAt.getTime() - Date.now()) / 60000
			if (body.partySize < venue.partyMin || body.partySize > venue.partyMax) throw unprocessable('party size out of range')
			if (venue.closedDates.some((cd) => cd.date.toISOString().slice(0, 10) === body.date) || !hours || minute < hours.openMinute || minute >= hours.closeMinute) {
				throw unprocessable('outside opening hours')
			}
			if (diffMin < venue.leadTimeMinutes || diffMin <= venue.cutoffMinutes) throw unprocessable('too soon to book')
			if (body.date > addDays(localDate(new Date(), venue.timeZone), 90)) throw unprocessable('date too far ahead')

			const { reservation, areaId } = await prisma.$transaction(async (tx) => {
				// Lock the chosen (or candidate) seating area(s) to serialize capacity checks.
				let areaId = body.seatingAreaId
				const venueAreas = await tx.seatingArea.findMany({
					where: { venueId: venue.id, bookable: true },
					orderBy: { id: 'asc' },
					select: { id: true, capacity: true, minParty: true, maxParty: true },
				})
				if (!areaId) {
					const candidate = await pickAreaForParty(tx as unknown as PrismaClient, venue.id, startsAt, body.partySize, venue.diningMinutes, venueAreas)
					if (!candidate) throw conflict('full')
					areaId = candidate
				} else {
					const [area] = await tx.$queryRaw<{ id: string; min_party: number | null; max_party: number | null }[]>`
						SELECT id, min_party, max_party FROM seating_areas
						WHERE id = ${areaId}::uuid AND venue_id = ${venue.id}::uuid AND bookable = true
						FOR UPDATE`
					if (!area) throw conflict('no_area')
					if ((area.min_party != null && body.partySize < area.min_party) || (area.max_party != null && body.partySize > area.max_party)) {
						throw unprocessable('party size not allowed in this area')
					}
				}

				const before = new Date(startsAt.getTime() - venue.diningMinutes * 60000)
				const after = new Date(startsAt.getTime() + venue.diningMinutes * 60000)
				const agg = await tx.reservation.aggregate({
					where: {
						seatingAreaId: areaId,
						startsAt: { gt: before, lt: after },
						status: { in: ['pending', 'confirmed', 'arrived', 'seated'] },
					},
					_sum: { partySize: true },
				})
				const usedSum = Number(agg._sum.partySize ?? 0)

				const capacity = venueAreas.find((a) => a.id === areaId)!.capacity
				if (usedSum + body.partySize > capacity) throw conflict('full')
				const existing = await tx.guest.findUnique({ where: { venueId_phone: { venueId: venue.id, phone: body.phone } }, select: { allergies: true } })
				const guest = await tx.guest.upsert({
					where: { venueId_phone: { venueId: venue.id, phone: body.phone } },
					update: {
						fullName: body.guestName,
						email: body.email ?? null,
						...(body.allergies?.length ? { allergies: { set: [...new Set([...(existing?.allergies ?? []), ...body.allergies])] } } : {}),
						...(body.accessibility ? { accessibility: body.accessibility } : {}),
					},
					create: {
						venueId: venue.id,
						fullName: body.guestName,
						phone: body.phone,
						email: body.email ?? null,
						allergies: body.allergies ?? [],
						accessibility: body.accessibility ?? null,
					},
				})

				const reservation = await tx.reservation.create({
					data: {
						venueId: venue.id,
						bookingCode: randomBookingCode(),
						guestId: guest.id,
						seatingAreaId: areaId,
						startsAt,
						partySize: body.partySize,
						occasion: body.occasion ?? null,
						guestNotes: body.guestNotes ?? null,
						source: body.source ?? 'website',
						status: 'pending',
						idempotencyKey: body.idempotencyKey ?? undefined,
					},
				})

				await tx.reservationStatusEvent.create({
					data: {
						reservationId: reservation.id,
						fromStatus: null,
						toStatus: 'pending',
						actorType: 'guest',
						actorUserId: null,
						reason: 'created',
					},
				})

				await tx.auditEvent.create({
					data: {
						venueId: venue.id,
						actorType: 'guest',
						action: 'reservation.created',
						entityType: 'reservation',
						entityId: reservation.id,
						note: 'public booking',
					},
				})

				return { reservation, areaId: areaId! }
			})

			await track('reservation created', distinctIdOf(request, reservation.id), {
				reservation_id: reservation.id,
				venue: slug,
				source: body.source ?? 'website',
				party_size: body.partySize,
				seating_area_id: areaId,
				days_ahead: Math.floor((startsAt.getTime() - Date.now()) / 86400000),
				lead_hours: Math.floor((startsAt.getTime() - Date.now()) / 3600000),
				has_occasion: !!body.occasion,
				has_dietary: (body.allergies?.length ?? 0) > 0,
			})
			return reply.status(201).send({
				bookingCode: reservation.bookingCode,
				reservationId: reservation.id,
				status: reservation.status,
			})
		},
	)

	app.get(
		'/public/reservations/:code',
		{
			schema: {
				params: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
			},
		},
		async (request: FastifyRequest<{ Params: { code: string } }>) => {
			const { code } = request.params
			const reservation = await prisma.reservation.findUnique({
				where: { bookingCode: code },
				include: { guest: true, seatingArea: true },
			})
			if (!reservation) throw notFound('reservation not found')

			const venue = await prisma.venue.findUnique({ where: { id: reservation.venueId } })
			return {
				bookingCode: reservation.bookingCode,
				date: venue ? localDate(reservation.startsAt, venue.timeZone) : reservation.startsAt.toISOString().slice(0, 10),
				time: venue ? localTime(reservation.startsAt, venue.timeZone) : reservation.startsAt.toISOString().slice(11, 16),
				partySize: reservation.partySize,
				seatingArea: reservation.seatingArea.name,
				status: reservation.status,
			}
		},
	)

	app.post(
		'/public/reservations/:code/cancel',
		{
			schema: {
				params: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
			},
		},
		async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
			const { code } = request.params
			const reservation = await prisma.reservation.findUnique({ where: { bookingCode: code } })
			if (!reservation) throw notFound('reservation not found')

			if (!canTransition(reservation.status, 'cancelled')) {
				return reply.status(409).send({ error: 'ERR_CANNOT_CANCEL', message: 'reservation cannot be cancelled' })
			}

			const updated = await prisma.$transaction(async (tx) => {
				const rows = await tx.$executeRaw`
					UPDATE reservations
					SET status = 'cancelled', updated_at = now()
					WHERE id = ${reservation.id}::uuid AND status = ${reservation.status}::reservation_status`
				if (rows === 0) throw conflict('concurrent update')
				const u = await tx.reservation.update({ where: { id: reservation.id }, data: {} })
				await tx.reservationStatusEvent.create({
					data: {
						reservationId: u.id,
						fromStatus: reservation.status,
						toStatus: 'cancelled',
						actorType: 'guest',
						actorUserId: null,
						reason: 'guest cancel',
					},
				})
				await tx.auditEvent.create({
					data: {
						venueId: u.venueId,
						actorType: 'guest',
						action: 'reservation.status_changed',
						entityType: 'reservation_status',
						entityId: u.id,
						changes: { status: { from: reservation.status, to: 'cancelled' } },
					},
				})
				return u
			})
			await track(
				'reservation cancelled',
				distinctIdOf(request, reservation.id),
				{
					reservation_id: reservation.id,
					from_status: reservation.status,
					actor_type: 'guest',
				},
			)
			return { bookingCode: updated.bookingCode, status: updated.status }
		},
	)

	app.post(
		'/public/reservations/:code/feedback',
		{
			schema: {
				params: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
				body: {
					type: 'object',
					required: ['rating'],
					properties: { rating: { type: 'integer' }, comments: { type: 'string' }, serviceTags: { type: 'array', items: { type: 'string' } } },
				},
			},
		},
		async (request: FastifyRequest<{ Params: { code: string }; Body: FeedbackBody }>, reply: FastifyReply) => {
			const { code } = request.params
			const { rating, comments = '', serviceTags = [] } = request.body

			const reservation = await prisma.reservation.findUnique({ where: { bookingCode: code } })
			if (!reservation) throw notFound('reservation not found')
			if (reservation.status !== 'completed') {
				return reply.status(409).send({ error: 'ERR_NOT_COMPLETED', message: 'feedback only allowed for completed reservations' })
			}

			const existing = await prisma.feedback.findUnique({ where: { reservationId: reservation.id } })
			if (existing) throw conflict('feedback already submitted')

			const feedback = await prisma.$transaction(async (tx) => {
				const f = await tx.feedback.create({
					data: {
						venueId: reservation.venueId,
						reservationId: reservation.id,
						rating,
						comments,
						serviceTags,
					},
				})
				await tx.auditEvent.create({
					data: {
						venueId: reservation.venueId,
						actorType: 'guest',
						action: 'feedback.submitted',
						entityType: 'feedback_link',
						entityId: reservation.id,
					},
				})
				return f
			})

			await track(
				'feedback submitted',
				distinctIdOf(request, reservation.id),
				{
					reservation_id: reservation.id,
					rating,
				},
			)
			return { id: feedback.id, rating: feedback.rating, submittedAt: feedback.submittedAt }
		},
	)
}
function distinctIdOf(request: FastifyRequest, fallback: string): string {
	const raw = request.headers['x-posthog-distinct-id']
	if (typeof raw !== 'string') return fallback
	const trimmed = raw.trim().slice(0, 200)
	return trimmed || fallback
}

async function pickAreaForParty(
	tx: PrismaClient,
	venueId: string,
	startsAt: Date,
	partySize: number,
	diningMinutes: number,
	areas: Array<{ id: string; capacity: number; minParty?: number | null; maxParty?: number | null }>,
): Promise<string | null> {
	const before = new Date(startsAt.getTime() - diningMinutes * 60000)
	const after = new Date(startsAt.getTime() + diningMinutes * 60000)
	// Lock areas in id order to avoid deadlocks.
	const locked = await tx.$queryRaw<{ id: string }[]>`
		SELECT id FROM seating_areas
		WHERE venue_id = ${venueId}::uuid AND bookable = true
		ORDER BY id
		FOR UPDATE`
		const usedByArea = await tx.$queryRaw<{ area_id: string; used: string }[]>`
		SELECT seating_area_id AS area_id, coalesce(sum(party_size), 0)::text AS used
		FROM reservations
		WHERE venue_id = ${venueId}::uuid
		  AND starts_at > ${before}
		  AND starts_at < ${after}
		  AND status IN ('pending', 'confirmed', 'arrived', 'seated')
		GROUP BY seating_area_id`
	const usedMap = new Map(usedByArea.map((r) => [r.area_id, Number(r.used)]))
	let best: { id: string; remaining: number } | null = null
	for (const area of locked) {
		const a = areas.find((x) => x.id === area.id)!
		if (a.minParty != null && partySize < a.minParty) continue
		if (a.maxParty != null && partySize > a.maxParty) continue
		const remaining = a.capacity - (usedMap.get(area.id) ?? 0)
		if (remaining < partySize) continue
		if (!best || remaining < best.remaining) best = { id: area.id, remaining }
	}
	return best ? best.id : null
}


