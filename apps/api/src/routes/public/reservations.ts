import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { notFound, conflict, unprocessable } from '../../lib/errors'
import { randomBookingCode } from '../../lib/crypto'
import { claimTable, assertAreaCapacity, pickAreaForParty, requestedTableArea } from '../../lib/tables'
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
	tableId?: string
	occasion?: string
	guestNotes?: string
	allergies?: string[]
	accessibility?: string
	country: string
	idempotencyKey?: string
	source?: 'website' | 'instagram' | 'google' | 'whatsapp'
	noticeAccepted?: boolean
	marketingConsent?: boolean
	attribution?: Partial<Record<(typeof ATTRIBUTION_FIELDS)[number], string>>
}

interface FeedbackBody {
	rating: number
	comments?: string
	serviceTags?: string[]
}

// First-touch source of the guest's PostHog session, sent by the booking page; emitted on 'reservation created' as $session_entry_*.
const ATTRIBUTION_FIELDS = ['referringDomain', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm'] as const
const ATTRIBUTION_PROPS: Record<(typeof ATTRIBUTION_FIELDS)[number], string> = {
	referringDomain: '$session_entry_referring_domain',
	utmSource: '$session_entry_utm_source',
	utmMedium: '$session_entry_utm_medium',
	utmCampaign: '$session_entry_utm_campaign',
	utmContent: '$session_entry_utm_content',
	utmTerm: '$session_entry_utm_term',
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
					required: ['guestName', 'phone', 'email', 'date', 'time', 'partySize', 'country'],
					properties: {
						guestName: { type: 'string', maxLength: 120 },
						phone: { type: 'string', maxLength: 32 },
						email: { type: 'string', maxLength: 254 },
						date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
						time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
						partySize: { type: 'integer', minimum: 1 },
						seatingAreaId: { type: 'string', format: 'uuid' },
						tableId: { type: 'string', format: 'uuid' },
						occasion: { type: 'string', maxLength: 100 },
						guestNotes: { type: 'string', maxLength: 1000 },
						allergies: { type: 'array', maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 60 } },
						accessibility: { type: 'string', maxLength: 300 },
						idempotencyKey: { type: 'string', format: 'uuid' },
						// Guests may only claim marketing channels, never staff ones (host, walk_in, ...).
						source: { type: 'string', enum: ['website', 'instagram', 'google', 'whatsapp'] },
						noticeAccepted: { type: 'boolean' },
						marketingConsent: { type: 'boolean' },
						website: { type: 'string', maxLength: 200 },
						attribution: {
							type: 'object',
							additionalProperties: false,
							properties: Object.fromEntries(ATTRIBUTION_FIELDS.map((f) => [f, { type: 'string', maxLength: 200 }])),
						},
						country: { type: 'string', minLength: 1, maxLength: 80 },
					},
				},
			},
		},
		async (request: FastifyRequest<{ Params: { slug: string }; Body: CreateReservationBody & { website?: string } }>, reply: FastifyReply) => {
			const { slug } = request.params
			const body = request.body
			const country = typeof body.country === 'string' ? body.country.trim() : ''
			if (!country) return reply.status(400).send({ error: 'ERR_BAD_REQUEST', message: 'country is required' })

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
			const onEvent = venue.noticeEnabled && venue.noticeDate?.toISOString().slice(0, 10) === body.date && venue.noticeEventName && venue.noticeEventTime
			const outsideHours = onEvent ? body.time !== venue.noticeEventTime : !hours || minute < hours.openMinute || minute >= hours.closeMinute
			if (venue.closedDates.some((cd) => cd.date.toISOString().slice(0, 10) === body.date) || outsideHours) {
				throw unprocessable('outside opening hours')
			}
			if (diffMin < venue.leadTimeMinutes || diffMin <= venue.cutoffMinutes) throw unprocessable('too soon to book')
			if (body.date > addDays(localDate(new Date(), venue.timeZone), 90)) throw unprocessable('date too far ahead')
			if (venue.noticeEnabled && venue.noticeDate && venue.noticeDate.toISOString().slice(0, 10) === body.date && !body.noticeAccepted) {
				throw unprocessable('special notice must be acknowledged')
			}

			const { reservation, areaId } = await prisma.$transaction(async (tx) => {
				// Lock the chosen (or candidate) seating area(s) to serialize capacity checks.
				let areaId = body.seatingAreaId
				if (body.tableId) areaId = await requestedTableArea(tx, venue.id, [body.tableId], body.partySize, areaId)
				if (!areaId) {
					const venueAreas = await tx.seatingArea.findMany({
						where: { venueId: venue.id, bookable: true },
						orderBy: { id: 'asc' },
						select: { id: true, capacity: true, minParty: true, maxParty: true },
					})
					const candidate = await pickAreaForParty(tx, venue.id, startsAt, body.partySize, venue.diningMinutes, venueAreas)
					if (!candidate) throw conflict('full')
					areaId = candidate
				}
				const [area] = await tx.$queryRaw<{ id: string; min_party: number | null; max_party: number | null }[]>`
					SELECT id, min_party, max_party FROM seating_areas
					WHERE id = ${areaId}::uuid AND venue_id = ${venue.id}::uuid AND bookable = true
					FOR UPDATE`
				if (!area) throw conflict('no_area')
				if ((area.min_party != null && body.partySize < area.min_party) || (area.max_party != null && body.partySize > area.max_party)) {
					throw unprocessable('party size not allowed in this area')
				}
				const chosen = await claimTable(tx, venue.id, areaId, startsAt, venue.diningMinutes, body.partySize, body.tableId ? [body.tableId] : undefined)

				await assertAreaCapacity(tx, areaId, startsAt, venue.diningMinutes, body.partySize)
				const existing = await tx.guest.findUnique({ where: { venueId_phone: { venueId: venue.id, phone: body.phone } }, select: { allergies: true } })
				const guest = await tx.guest.upsert({
					where: { venueId_phone: { venueId: venue.id, phone: body.phone } },
					update: {
						fullName: body.guestName,
						email: body.email ?? null,
						...(body.allergies?.length ? { allergies: { set: [...new Set([...(existing?.allergies ?? []), ...body.allergies])] } } : {}),
						...(body.accessibility ? { accessibility: body.accessibility } : {}),
						...(country ? { country } : {}),
						// Opt-in only: an unticked box on a later booking is not a withdrawal.
						...(body.marketingConsent ? { marketingConsent: true, marketingConsentAt: new Date() } : {}),
					},
					create: {
						venueId: venue.id,
						fullName: body.guestName,
						phone: body.phone,
						email: body.email ?? null,
						allergies: body.allergies ?? [],
						country: country || null,
						accessibility: body.accessibility ?? null,
						...(body.marketingConsent ? { marketingConsent: true, marketingConsentAt: new Date() } : {}),
					},
				})

				const reservation = await tx.reservation.create({
					data: {
						venueId: venue.id,
						bookingCode: randomBookingCode(),
						guestId: guest.id,
						tables: chosen.length ? { create: chosen.map((tableId) => ({ tableId })) } : undefined,
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
				...Object.fromEntries(ATTRIBUTION_FIELDS.flatMap((f) => (body.attribution?.[f] ? [[ATTRIBUTION_PROPS[f], body.attribution[f]]] : []))),
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
				include: { seatingArea: true, venue: { select: { timeZone: true } } },
			})
			if (!reservation) throw notFound('reservation not found')
			return {
				bookingCode: reservation.bookingCode,
				date: localDate(reservation.startsAt, reservation.venue.timeZone),
				time: localTime(reservation.startsAt, reservation.venue.timeZone),
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
			const reservation = await prisma.reservation.findUnique({
				where: { bookingCode: code },
				include: { venue: { select: { slug: true } } },
			})
			if (!reservation) throw notFound('reservation not found')

			if (!canTransition(reservation.status, 'cancelled')) {
				return reply.status(409).send({ error: 'ERR_CANNOT_CANCEL', message: 'reservation cannot be cancelled' })
			}

			await prisma.$transaction(async (tx) => {
				const rows = await tx.$executeRaw`
					UPDATE reservations
					SET status = 'cancelled', updated_at = now()
					WHERE id = ${reservation.id}::uuid AND status = ${reservation.status}::reservation_status`
				if (rows === 0) throw conflict('concurrent update')
				await tx.reservationStatusEvent.create({
					data: {
						reservationId: reservation.id,
						fromStatus: reservation.status,
						toStatus: 'cancelled',
						actorType: 'guest',
						actorUserId: null,
						reason: 'guest cancel',
					},
				})
				await tx.auditEvent.create({
					data: {
						venueId: reservation.venueId,
						actorType: 'guest',
						action: 'reservation.status_changed',
						entityType: 'reservation_status',
						entityId: reservation.id,
						changes: { status: { from: reservation.status, to: 'cancelled' } },
					},
				})
			})
			await track(
				'reservation cancelled',
				distinctIdOf(request, reservation.id),
				{
					reservation_id: reservation.id,
					venue: reservation.venue.slug,
					from_status: reservation.status,
					actor_type: 'guest',
				},
			)
			return { bookingCode: reservation.bookingCode, status: 'cancelled' }
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

			const reservation = await prisma.reservation.findUnique({
				where: { bookingCode: code },
				include: { venue: { select: { slug: true } } },
			})
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
					venue: reservation.venue.slug,
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
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return fallback
	return raw
}
