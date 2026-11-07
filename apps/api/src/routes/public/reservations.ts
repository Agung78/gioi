import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { notFound, conflict, forbidden, unprocessable } from '../../lib/errors'
import { randomBookingCode } from '../../lib/crypto'
import { canTransition, localDate, localTime, toUtc } from '@gioi/domain'

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
	idempotencyKey?: string
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
					required: ['guestName', 'phone', 'date', 'time', 'partySize'],
					properties: {
						guestName: { type: 'string' },
						phone: { type: 'string' },
						email: { type: 'string' },
						date: { type: 'string' },
						time: { type: 'string' },
						partySize: { type: 'integer' },
						seatingAreaId: { type: 'string', format: 'uuid' },
						occasion: { type: 'string' },
						guestNotes: { type: 'string' },
						idempotencyKey: { type: 'string', format: 'uuid' },
						turnstileToken: { type: 'string' },
					},
				},
			},
		},
		async (request: FastifyRequest<{ Params: { slug: string }; Body: CreateReservationBody & { turnstileToken?: string } }>, reply: FastifyReply) => {
			const { slug } = request.params
			const body = request.body

			// Turnstile verification. Skipping is not allowed in production.
			const secret = process.env.TURNSTILE_SECRET_KEY
			if (!secret && process.env.NODE_ENV === 'production') {
				throw forbidden('Turnstile not configured')
			}
			if (secret) {
				const verified = await verifyTurnstile(secret, body.turnstileToken)
				if (!verified) throw unprocessable('Turnstile verification failed')
			}

			const venue = await prisma.venue.findUnique({ where: { slug } })
			if (!venue) throw notFound('venue not found')

			if (body.idempotencyKey) {
				const existing = await prisma.reservation.findUnique({
					where: { idempotencyKey: body.idempotencyKey },
				})
				if (existing) return reply.status(200).send({ bookingCode: existing.bookingCode, reservationId: existing.id })
			}

			const startsAt = toUtc(body.date, body.time, venue.timeZone)

			await prisma.$transaction(async (tx) => {
				// Lock the chosen (or candidate) seating area(s) to serialize capacity checks.
				let areaId = body.seatingAreaId
				const venueAreas = await tx.seatingArea.findMany({
					where: { venueId: venue.id, bookable: true },
					orderBy: { id: 'asc' },
					select: { id: true, capacity: true },
				})
				if (!areaId) {
					const candidate = await pickAreaForParty(tx as unknown as PrismaClient, venue.id, startsAt, body.partySize, venue.diningMinutes, venueAreas)
					if (!candidate) throw conflict('full')
					areaId = candidate
				} else {
					const [area] = await tx.$queryRaw<{ id: string }[]>`
						SELECT id FROM seating_areas
						WHERE id = ${areaId}::uuid AND venue_id = ${venue.id}::uuid AND bookable = true
						FOR UPDATE`
					if (!area) throw conflict('no_area')
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
				const guest = await tx.guest.upsert({
					where: { venueId_phone: { venueId: venue.id, phone: body.phone } },
					update: { fullName: body.guestName, email: body.email ?? null },
					create: {
						venueId: venue.id,
						fullName: body.guestName,
						phone: body.phone,
						email: body.email ?? null,
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
						source: 'website',
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

				return reply.status(201).send({
					bookingCode: reservation.bookingCode,
					reservationId: reservation.id,
					status: reservation.status,
				})
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

			return { id: feedback.id, rating: feedback.rating, submittedAt: feedback.submittedAt }
		},
	)
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
		const cap = areas.find((a) => a.id === area.id)!.capacity
		const used = usedMap.get(area.id) ?? 0
		const remaining = cap - used
		if (remaining < partySize) continue
		if (!best || remaining < best.remaining) best = { id: area.id, remaining }
	}
	return best ? best.id : null
}

async function verifyTurnstile(secret: string, token?: string): Promise<boolean> {
	if (!token) return false
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ secret, response: token }),
		})
		const json = await res.json()
		return !!json.success
	} catch {
		return false
	}
}
