import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { PrismaClient, Prisma, VenueRole } from '@prisma/client'
import type { AuthedSession } from '../../lib/auth'
import {
	canTransition,
	nextStatuses,
	dashboardData,
	type ReservationStatus,
	type Channel,
	type Settings,
	type DashboardFilters,
	type StaffTableAvailability,
	type StaffTableState,
} from '@gioi/domain'
import { notFound, conflict, forbidden, unprocessable, AppError } from '../../lib/errors'
import { csvEscape } from '../../lib/csv'
import { hash } from '@node-rs/argon2'
import { venueToSettings, noticeDateOf } from '../../lib/settings'
import { requireAuth, requireAdmin, requireVenueAccess } from '../../lib/middleware'
import { claimTable, isLate, requestedTableArea, tableHolders, type TableHolder } from '../../lib/tables'
import {
	localDate,
	localTime,
	startOfLocalDay,
	startOfNextLocalDay,
	addDays,
	dayOfWeek,
	toMinutes,
	fromMinutes,
	toUtc,
} from '@gioi/domain'

function staffVenue(session: AuthedSession, venueId?: string): string {
	const id = venueId ?? session.user.venueIds[0]
	if (!id) throw forbidden('no venue associated with this user')
	return id
}

function normalizeLogin(raw: string): string {
	const login = raw.trim().toLowerCase()
	if (!login || /\s/.test(login)) throw unprocessable('login must not contain spaces')
	return login
}

function asJson(v: unknown): Prisma.InputJsonValue | null {
	return v as unknown as Prisma.InputJsonValue | null
}

export function registerStaffRoutes(app: FastifyInstance, prisma: PrismaClient): void {
	// ---- Host: day view -----------------------------------------------------
	app.get(
		'/staff/day',
		{
			schema: {
				querystring: {
					type: 'object',
					properties: { date: { type: 'string' } },
				},
			},
		},
		async (request: FastifyRequest<{ Querystring: { date?: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const venueId = staffVenue(session)
			requireVenueAccess(session, venueId)
			const venue = await prisma.venue.findUnique({
				where: { id: venueId },
				select: { slug: true, name: true, feedbackMessageTemplate: true, timeZone: true },
			})
			if (!venue) throw notFound('venue not found')
			const date = request.query.date ?? localDate(new Date(), venue.timeZone)

			const reservations = await prisma.reservation.findMany({
				where: { venueId, startsAt: { gte: startOfLocalDay(date, venue.timeZone), lt: startOfNextLocalDay(date, venue.timeZone) } },
				include: { guest: true, seatingArea: true, tables: true },
				orderBy: [{ startsAt: 'asc' }],
			})
			const guestIds = [...new Set(reservations.map((r) => r.guestId).filter(Boolean))] as string[]
			const priorCompleted = await prisma.reservation.findMany({
				where: { guestId: { in: guestIds }, status: 'completed' },
				select: { guestId: true, startsAt: true },
			})
			const earliestCompleted = new Map<string, Date>()
			for (const pc of priorCompleted) {
				const cur = earliestCompleted.get(pc.guestId)
				if (!cur || pc.startsAt < cur) earliestCompleted.set(pc.guestId, pc.startsAt)
			}
			const areas = await prisma.seatingArea.findMany({
				where: { venueId, bookable: true },
				orderBy: { name: 'asc' },
			})

			return {
				date,
				venueId,
				reservations: reservations.map((r) => ({
					id: r.id,
					bookingCode: r.bookingCode,
					guestId: r.guestId,
					guestName: r.guest.fullName,
					guestPhone: r.guest.phone ?? null,
					partySize: r.partySize,
					startsAt: r.startsAt.toISOString(),
					seatingArea: r.seatingArea.name,
					date: localDate(r.startsAt, venue.timeZone),
					time: localTime(r.startsAt, venue.timeZone),
					internalNotes: r.internalNotes ?? null,
					status: r.status,
					source: r.source,
					occasion: r.occasion ?? null,
					guestNotes: r.guestNotes ?? null,
					allergies: r.guest.allergies ?? [],
					accessibility: r.guest.accessibility ?? null,
					tableIds: (r.tables ?? []).map((t) => t.tableId),
					isRepeat: ((first) => first !== undefined && first < r.startsAt)(earliestCompleted.get(r.guestId)),
				})),
				areas,
				venue,
			}
		},
	)

	// ---- Host: create phone / walk-in ---------------------------------------
	app.post(
		'/staff/reservations',
		{
			schema: {
				body: {
					type: 'object',
					required: ['guestName', 'date', 'time', 'partySize', 'source'],
					properties: {
						guestName: { type: 'string' },
						phone: { type: 'string' },
						email: { type: 'string' },
						date: { type: 'string' },
						time: { type: 'string' },
						partySize: { type: 'integer', minimum: 1 },
						seatingAreaId: { type: 'string' },
						occasion: { type: 'string' },
						tableIds: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', format: 'uuid' } },
						guestNotes: { type: 'string' },
						internalNotes: { type: 'string' },
						country: { type: 'string', maxLength: 80 },
						source: { type: 'string' },
						takeOver: { type: 'boolean' },
					},
				},
			},
		},
		async (request: FastifyRequest<{ Body: Record<string, unknown> }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const body = request.body
			const venueId = staffVenue(session, body.venueId as string | undefined)
			requireVenueAccess(session, venueId)

			if (typeof body.date !== 'string' || typeof body.time !== 'string') {
				throw unprocessable('date and time are required')
			}
			const venue = await prisma.venue.findUnique({
				where: { id: venueId },
				include: { openingHours: true, closedDates: true },
			})
			if (!venue) throw notFound('venue not found')

			// Walk-ins skip lead-time/past rules but must still fall inside opening hours.
			const weekday = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(dayOfWeek(body.date))
			const hours = venue.openingHours.find((oh) => oh.weekday === weekday)
			const minute = toMinutes(body.time)
			const closed = venue.closedDates.some((cd) => cd.date.toISOString().slice(0, 10) === body.date)
			if (closed || !hours || minute < hours.openMinute || minute >= hours.closeMinute) {
				throw unprocessable('outside opening hours')
			}

			const startsAt = toUtc(body.date, body.time, venue.timeZone)
			return prisma.$transaction(async (tx) => {
				let areaId = typeof body.seatingAreaId === 'string' ? body.seatingAreaId : undefined
				const tableReq = Array.isArray(body.tableIds) ? body.tableIds.filter((t) => typeof t === 'string') as string[] : undefined
				if (tableReq) areaId = await requestedTableArea(tx, venueId, tableReq, body.partySize as number, areaId)
				if (!areaId) {
					const areas = await tx.seatingArea.findMany({
						where: { venueId, bookable: true },
						orderBy: { id: 'asc' },
						select: { id: true, capacity: true },
					})
					const before = new Date(startsAt.getTime() - venue.diningMinutes * 60000)
					const after = new Date(startsAt.getTime() + venue.diningMinutes * 60000)
					const usedMap = new Map<string, number>()
					for (const a of areas) {
						const agg = await tx.reservation.aggregate({
							where: {
								seatingAreaId: a.id,
								startsAt: { gte: before, lte: after },
								status: { in: ['pending', 'confirmed', 'arrived', 'seated'] },
							},
							_sum: { partySize: true },
						})
						usedMap.set(a.id, Number(agg._sum.partySize ?? 0))
					}
					let best: { id: string; remaining: number } | null = null
					for (const a of areas) {
						const remaining = a.capacity - (usedMap.get(a.id) ?? 0)
						if (remaining < (body.partySize as number)) continue
						if (!best || remaining < best.remaining) best = { id: a.id, remaining }
					}
					if (!best) throw conflict('full')
					areaId = best.id
				} else {
					const [area] = await tx.$queryRaw<{ id: string }[]>`
						SELECT id FROM seating_areas
						WHERE id = ${areaId}::uuid AND venue_id = ${venueId}::uuid AND bookable = true
						FOR UPDATE`
					if (!area) throw conflict('no_area')
				}

				const chosen = await claimTable(tx, venueId, areaId, startsAt, venue.diningMinutes, body.partySize as number, tableReq, {
					takeOver: body.takeOver === true ? { graceMinutes: venue.graceMinutes, actorUserId: session.user.id } : undefined,
				})

				const phone = ((body.phone as string | undefined) ?? '').trim() || null
				const country = typeof body.country === 'string' ? body.country.trim() : undefined
				const guestFields: { fullName: string; email: string | null; country?: string } = {
					fullName: body.guestName as string,
					email: (body.email as string | undefined) ?? null,
					...(country ? { country } : {}),
				}
				// Phone is optional: without one there is nothing to dedupe on, so always create a new guest.
				const guest = phone
					? await tx.guest.upsert({
						where: { venueId_phone: { venueId, phone } },
						update: guestFields,
						create: { venueId, phone, ...guestFields },
					})
					: await tx.guest.create({ data: { venueId, ...guestFields } })

				const reservation = await tx.reservation.create({
					data: {
						venueId,
						bookingCode: randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase(),
						guestId: guest.id,
						seatingAreaId: areaId,
						startsAt,
						partySize: body.partySize as number,
						occasion: (body.occasion as string | undefined) ?? null,
						guestNotes: (body.guestNotes as string | undefined) ?? null,
						internalNotes: (body.internalNotes as string | undefined) ?? null,
						source: body.source as Channel,
						status: 'pending',
						createdById: session.user.id,
						tables: chosen.length ? { create: chosen.map((tableId) => ({ tableId })) } : undefined,
					},
				})

				await tx.reservationStatusEvent.create({
					data: {
						reservationId: reservation.id,
						fromStatus: null,
						toStatus: 'pending',
						actorType: 'user',
						actorUserId: session.user.id,
						reason: 'staff create',
					},
				})

				await tx.auditEvent.create({
					data: {
						venueId,
						actorType: 'user',
						actorUserId: session.user.id,
						action: 'reservation.created',
						entityType: 'reservation',
						entityId: reservation.id,
					},
				})

				return { bookingCode: reservation.bookingCode, reservationId: reservation.id }
			})
		},
	)

	// ---- Host: edit ---------------------------------------------------------
	app.patch(
		'/staff/reservations/:id',
		{
			schema: {
				params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
				body: { type: 'object', properties: { tableIds: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', format: 'uuid' } } } },
			},
		},
		async (request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const body = request.body
			const reservation = await prisma.reservation.findUnique({ where: { id: request.params.id } })
			if (!reservation) throw notFound('reservation not found')
			requireVenueAccess(session, reservation.venueId)
			// any venue member (host or admin) may edit; venue access checked above

			const updates: Record<string, unknown> = {}
			if (typeof body.partySize === 'number') updates.partySize = body.partySize
			if (typeof body.seatingAreaId === 'string') updates.seatingAreaId = body.seatingAreaId
			if (typeof body.startsAt === 'string') updates.startsAt = new Date(body.startsAt)
			if (typeof body.occasion === 'string') updates.occasion = body.occasion
			if (typeof body.guestNotes === 'string') updates.guestNotes = body.guestNotes
			if (typeof body.internalNotes === 'string') updates.internalNotes = body.internalNotes
			if (typeof body.source === 'string') updates.source = body.source
			const newTables = Array.isArray(body.tableIds) ? body.tableIds.filter((t) => typeof t === 'string') as string[] : undefined
			const reslot = 'startsAt' in updates || 'partySize' in updates || 'seatingAreaId' in updates

			const updated = await prisma.$transaction(async (tx) => {
				// New tables, or a moved/resized booking that keeps its tables, must still fit: free, together big enough, one area.
				const existingIds = (await tx.reservationTable.findMany({ where: { reservationId: reservation.id }, select: { tableId: true } })).map((r) => r.tableId)
				if (newTables?.length || (existingIds.length > 0 && reslot)) {
					const { diningMinutes } = await tx.venue.findUniqueOrThrow({ where: { id: reservation.venueId }, select: { diningMinutes: true } })
					const startsAt = (updates.startsAt as Date | undefined) ?? reservation.startsAt
					const partySize = (updates.partySize as number | undefined) ?? reservation.partySize
					const ids = newTables?.length ? newTables : existingIds
					const areaId = await requestedTableArea(tx, reservation.venueId, ids, partySize, (updates.seatingAreaId as string | undefined) ?? (newTables?.length ? undefined : reservation.seatingAreaId))
					if (areaId !== reservation.seatingAreaId) updates.seatingAreaId = areaId
					await tx.$queryRaw`SELECT id FROM seating_areas WHERE id = ${areaId}::uuid AND venue_id = ${reservation.venueId}::uuid FOR UPDATE` // same lock bookings take: two moves can't grab one table
					await claimTable(tx, reservation.venueId, areaId, startsAt, diningMinutes, partySize, ids, { excludeReservationId: reservation.id })
					if (newTables?.length) {
						await tx.reservationTable.deleteMany({ where: { reservationId: reservation.id } })
						await tx.reservationTable.createMany({ data: newTables.map((tableId) => ({ reservationId: reservation.id, tableId })) })
					}
				}
				if (Object.keys(updates).length > 0) updates.updatedAt = new Date()
				return tx.reservation.update({
					where: { id: reservation.id },
					data: updates as unknown as Prisma.ReservationUpdateInput,
				})
			})

			const changed: Record<string, { from: unknown; to: unknown }> = {}
			for (const key of Object.keys(updates)) {
				changed[key] = { from: (reservation as Record<string, unknown>)[key], to: (updated as Record<string, unknown>)[key] }
			}

			await prisma.auditEvent.create({
				data: {
					venueId: reservation.venueId,
					actorType: 'user',
					actorUserId: session.user.id,
					action: 'reservation.updated',
					entityType: 'reservation',
					entityId: reservation.id,
					changes: asJson(changed) as Prisma.InputJsonValue,
				},
			})

			return { bookingCode: updated.bookingCode, status: updated.status }
		},
	)

	// ---- Host: why a table can't be taken at a time -------------------------
	app.get(
		'/admin/venues/:id/table-availability',
		{
			schema: {
				params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
				querystring: {
					type: 'object',
					properties: {
						date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
						time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
						partySize: { type: 'integer', minimum: 1 },
						excludeReservationId: { type: 'string', format: 'uuid' },
					},
					required: ['date', 'time', 'partySize'],
				},
			},
		},
		async (
			request: FastifyRequest<{ Params: { id: string }; Querystring: { date: string; time: string; partySize: number; excludeReservationId?: string } }>,
		): Promise<StaffTableAvailability> => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			const { date, time, partySize, excludeReservationId } = request.query
			const venue = await prisma.venue.findUnique({ where: { id: request.params.id }, select: { timeZone: true, diningMinutes: true, graceMinutes: true } })
			if (!venue) throw notFound('venue not found')

			const holders = await tableHolders(prisma, request.params.id, toUtc(date, time, venue.timeZone), venue.diningMinutes, excludeReservationId)
			const tables: StaffTableState[] = []
			const byTable = new Map<string, TableHolder[]>()
			for (const h of holders) byTable.set(h.tableId, [...(byTable.get(h.tableId) ?? []), h])
			for (const [tableId, hs] of byTable) {
				const blocker = hs.find((h) => !isLate(h, venue.graceMinutes))
				const h = blocker ?? hs[0]!
				tables.push({
					tableId,
					reason: blocker ? 'held' : 'late',
					holder: { reservationId: h.id, guestName: h.guestName, time: localTime(h.startsAt, venue.timeZone), status: h.status },
				})
			}
			return { tables }
		},
	)

	// ---- Host: status transition --------------------------------------------
	app.post(
		'/staff/reservations/:id/status',
		{
			schema: {
				params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
				body: {
					type: 'object',
					required: ['to'],
					properties: { to: { type: 'string' } },
				},
			},
		},
		async (request: FastifyRequest<{ Params: { id: string }; Body: { to: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const { to } = request.body
			const reservation = await prisma.reservation.findUnique({ where: { id: request.params.id } })
			if (!reservation) throw notFound('reservation not found')
			requireVenueAccess(session, reservation.venueId)

			if (!canTransition(reservation.status as ReservationStatus, to as ReservationStatus)) {
				throw new AppError(409, 'cannot transition status', 'ERR_INVALID_TRANSITION')
			}

			const updated = await prisma.$transaction(async (tx) => {
				const rows = await tx.$executeRaw`
					UPDATE reservations
					SET status = ${to}::reservation_status, updated_at = now()
					WHERE id = ${reservation.id}::uuid AND status = ${reservation.status}::reservation_status`
				if (rows === 0) throw conflict('concurrent update')

				await tx.reservationStatusEvent.create({
					data: {
						reservationId: reservation.id,
						fromStatus: reservation.status,
						toStatus: to as ReservationStatus,
						actorType: 'user',
						actorUserId: session.user.id,
						reason: 'staff status change',
					},
				})

				await tx.auditEvent.create({
					data: {
						venueId: reservation.venueId,
						actorType: 'user',
						actorUserId: session.user.id,
						action: 'reservation.status_changed',
						entityType: 'reservation_status',
						entityId: reservation.id,
						changes: asJson({ status: { from: reservation.status, to } }) as Prisma.InputJsonValue,
					},
				})

				return tx.reservation.update({ where: { id: reservation.id }, data: {} })
			})

			return { bookingCode: updated.bookingCode, status: updated.status }
		},
	)

	// ---- Host: next statuses for UI -----------------------------------------
	app.get(
		'/staff/reservations/:id/next-statuses',
		async (request: FastifyRequest<{ Params: { id: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const reservation = await prisma.reservation.findUnique({ where: { id: request.params.id } })
			if (!reservation) throw notFound('reservation not found')
			requireVenueAccess(session, reservation.venueId)
			return { next: nextStatuses(reservation.status as ReservationStatus) }
		},
	)

	// ---- Host: guest profile + history --------------------------------------
	app.get(
		'/staff/guests/:id',
		async (request: FastifyRequest<{ Params: { id: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const guest = await prisma.guest.findUnique({ where: { id: request.params.id } })
			if (!guest) throw notFound('guest not found')
			requireVenueAccess(session, guest.venueId)

			const reservations = await prisma.reservation.findMany({
				where: { guestId: guest.id },
				include: { seatingArea: true, feedback: true },
				orderBy: { startsAt: 'desc' },
			})
			const venue = await prisma.venue.findUniqueOrThrow({ where: { id: guest.venueId }, select: { timeZone: true } })

			return {
				id: guest.id,
				fullName: guest.fullName,
				phone: guest.phone ?? null,
				email: guest.email ?? null,
				country: guest.country ?? null,
				allergies: guest.allergies ?? [],
				accessibility: guest.accessibility ?? null,
				seatingPreference: guest.seatingPreference ?? null,
				notes: guest.notes ?? null,
				marketingConsent: guest.marketingConsent,
				createdAt: guest.createdAt.toISOString(),
				reservations: reservations.map((r) => ({
					id: r.id,
					bookingCode: r.bookingCode,
					date: localDate(r.startsAt, venue.timeZone),
					time: localTime(r.startsAt, venue.timeZone),
					partySize: r.partySize,
					seatingArea: r.seatingArea.name,
					status: r.status,
					source: r.source,
					occasion: r.occasion ?? null,
					feedback: r.feedback
						? {
								rating: r.feedback.rating,
								comments: r.feedback.comments,
								serviceTags: r.feedback.serviceTags,
								submittedAt: r.feedback.submittedAt.toISOString(),
							}
						: null,
				})),
			}
		},
	)
	// ---- Host: guest list (search) ------------------------------------------
	app.get(
		'/staff/guests',
		async (request: FastifyRequest<{ Querystring: { q?: string; venueId?: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const venueId = request.query.venueId ?? session.user.venueIds[0]
			if (!venueId) throw forbidden('no venue associated with this user')
			requireVenueAccess(session, venueId)
			const q = (request.query.q ?? '').trim().toLowerCase()
			const guests = await prisma.guest.findMany({
				where: {
					venueId,
					...(q && {
						OR: [
							{ fullName: { contains: q, mode: 'insensitive' as const } },
							{ email: { contains: q, mode: 'insensitive' as const } },
							{ phone: { contains: q } },
						],
					}),
				},
				include: { _count: { select: { reservations: { where: { status: { in: ['arrived', 'seated', 'completed'] } } } } } },
				take: 8,
				orderBy: { fullName: 'asc' },
			})
			return guests.map((g) => ({
				id: g.id,
				fullName: g.fullName,
				phone: g.phone ?? null,
				email: g.email ?? null,
				country: g.country ?? null,
				allergies: g.allergies ?? [],
				accessibility: g.accessibility ?? null,
				seatingPreference: g.seatingPreference ?? null,
				notes: g.notes ?? null,
				marketingConsent: g.marketingConsent,
				createdAt: g.createdAt.toISOString(),
				reservations: [],
				visits: g._count.reservations,
			}))
		},
	)

	// ---- Admin: venue settings ----------------------------------------------

	app.get(
		'/admin/venues/:id',
		async (request: FastifyRequest<{ Params: { id: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			requireAdmin(session, request.params.id)
			const venue = await prisma.venue.findUnique({ where: { id: request.params.id } })
			if (!venue) throw notFound('venue not found')
			return { ...venue, noticeDate: noticeDateOf(venue) }
		},
	)

	app.patch(
		'/admin/venues/:id',
		async (request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			if (!session.user.isSuperAdmin && session.user.venueRoles[request.params.id] !== 'admin') {
				throw forbidden('insufficient role')
			}
			const venue = await prisma.venue.findUnique({ where: { id: request.params.id } })
			if (!venue) throw notFound('venue not found')

			const updatable = [
				'tagline', 'intro', 'address', 'phone', 'whatsapp', 'email', 'mapsUrl',
				'bookingIntervalMinutes', 'partyMin', 'partyMax', 'diningMinutes', 'graceMinutes',
				'leadTimeMinutes', 'cutoffMinutes', 'noShowTargetPercent',
				'overCapacityAlertPercent', 'cancellationPolicy', 'feedbackTitle',
				'feedbackSubtitle', 'feedbackMessageTemplate', 'noticeEnabled', 'noticeText',
			]
			const changes: Record<string, { from: unknown; to: unknown }> = {}
			const data: Record<string, unknown> = {}
			for (const key of updatable) {
				if (key in request.body && request.body[key] !== (venue as Record<string, unknown>)[key]) {
					changes[key] = { from: (venue as Record<string, unknown>)[key], to: request.body[key] }
					data[key] = request.body[key]
				}
			}
			if (typeof data.mapsUrl === 'string' && data.mapsUrl !== '' && !/^https?:\/\//i.test(data.mapsUrl)) throw unprocessable('mapsUrl must be an http(s) URL')
			if ('noticeDate' in request.body) {
				const to = request.body.noticeDate
				if (to !== null && (typeof to !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(to) || Number.isNaN(Date.parse(to)))) throw unprocessable('noticeDate must be YYYY-MM-DD or null')
				if (to !== noticeDateOf(venue)) {
					changes.noticeDate = { from: noticeDateOf(venue), to }
					data.noticeDate = to === null ? null : new Date(to)
				}
			}
			if (typeof (data.noticeEnabled ?? venue.noticeEnabled) !== 'boolean') throw unprocessable('noticeEnabled must be a boolean')
			for (const key of ['bookingIntervalMinutes', 'partyMin', 'partyMax', 'diningMinutes', 'leadTimeMinutes', 'cutoffMinutes', 'noShowTargetPercent', 'overCapacityAlertPercent']) {
				const v = data[key]
				if (v !== undefined && (!Number.isInteger(v) || (v as number) < 0)) throw unprocessable(`${key} must be a non-negative integer`)
			}
			const grace = data.graceMinutes
			if (grace !== undefined && (!Number.isInteger(grace) || (grace as number) < 0 || (grace as number) > 120)) throw unprocessable('graceMinutes must be an integer between 0 and 120')
			const merged = { ...venue, ...data } as typeof venue
			if (merged.partyMin < 1 || merged.partyMin > merged.partyMax) throw unprocessable('party size limits are invalid')
			if (Object.keys(data).length > 0) data.updatedAt = new Date()

			const updated = await prisma.venue.update({
				where: { id: request.params.id },
				data: data as unknown as Prisma.VenueUpdateInput,
			})

			if (Object.keys(changes).length > 0) await prisma.auditEvent.create({
				data: {
					venueId: request.params.id,
					actorType: 'user',
					actorUserId: session.user.id,
					action: 'settings.updated',
					entityType: 'settings',
					entityId: request.params.id,
					changes: asJson(changes) as Prisma.InputJsonValue,
				},
			})

			return { ...updated, noticeDate: noticeDateOf(updated) }
		},
	)

	// ---- Admin: opening hours -----------------------------------------------
	app.get(
		'/admin/venues/:id/opening-hours',
		async (request: FastifyRequest<{ Params: { id: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			requireAdmin(session, request.params.id)
			return prisma.openingHours.findMany({ where: { venueId: request.params.id }, orderBy: { weekday: 'asc' } })
		},
	)

	app.put(
		'/admin/venues/:id/opening-hours',
		async (
			request: FastifyRequest<{
				Params: { id: string }
				Body: Array<{ weekday: number; openMinute: number; closeMinute: number }>
			}>,
		) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			if (!session.user.isSuperAdmin && session.user.venueRoles[request.params.id] !== 'admin') {
				throw forbidden('insufficient role')
			}

			await prisma.$transaction(async (tx) => {
				for (const row of request.body) {
					await tx.openingHours.upsert({
						where: { venueId_weekday: { venueId: request.params.id, weekday: row.weekday } },
						update: { openMinute: row.openMinute, closeMinute: row.closeMinute },
						create: {
							venueId: request.params.id,
							weekday: row.weekday,
							openMinute: row.openMinute,
							closeMinute: row.closeMinute,
						},
					})
				}
				await tx.auditEvent.create({
					data: {
						venueId: request.params.id,
						actorType: 'user',
						actorUserId: session.user.id,
						action: 'opening_hours.updated',
						entityType: 'settings',
						entityId: request.params.id,
					},
				})
			})
			return prisma.openingHours.findMany({ where: { venueId: request.params.id }, orderBy: { weekday: 'asc' } })
		},
	)

	// ---- Admin: closed dates ------------------------------------------------
	app.get(
		'/admin/venues/:id/closed-dates',
		async (request: FastifyRequest<{ Params: { id: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			requireAdmin(session, request.params.id)
			return prisma.closedDate.findMany({ where: { venueId: request.params.id }, orderBy: { date: 'asc' } })
		},
	)

	app.put(
		'/admin/venues/:id/closed-dates',
		{
			schema: {
				body: {
					type: 'array',
					items: {
						type: 'object',
						required: ['date'],
						properties: {
							date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}' },
							reason: { type: ['string', 'null'], maxLength: 200 },
						},
					},
				},
			},
		},
		async (
			request: FastifyRequest<{
				Params: { id: string }
				Body: Array<{ date: string; reason?: string }>
			}>,
		) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			if (!session.user.isSuperAdmin && session.user.venueRoles[request.params.id] !== 'admin') {
				throw forbidden('insufficient role')
			}

			await prisma.$transaction(async (tx) => {
				await tx.closedDate.deleteMany({ where: { venueId: request.params.id } })
				for (const row of request.body) {
					await tx.closedDate.create({
						data: { venueId: request.params.id, date: new Date(row.date), reason: row.reason ?? null },
					})
				}
				await tx.auditEvent.create({
					data: {
						venueId: request.params.id,
						actorType: 'user',
						actorUserId: session.user.id,
						action: 'closed_dates.updated',
						entityType: 'settings',
						entityId: request.params.id,
					},
				})
			})
			return prisma.closedDate.findMany({ where: { venueId: request.params.id }, orderBy: { date: 'asc' } })
		},
	)

	// ---- Admin: venues ------------------------------------------------------
	app.get('/admin/venues', async (request: FastifyRequest) => {
		const session = await requireAuth(prisma, request.cookies as Record<string, string>)
		if (!session.user.isSuperAdmin) throw forbidden('super admin required')
		return prisma.venue.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: 'asc' } })
	})

	app.post(
		'/admin/venues',
		{
			schema: {
				body: {
					type: 'object',
					required: ['slug', 'name'],
					properties: {
						slug: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', maxLength: 64 },
						name: { type: 'string', minLength: 1, maxLength: 120 },
					},
				},
			},
		},
		async (request: FastifyRequest<{ Body: { slug: string; name: string } }>, reply) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			if (!session.user.isSuperAdmin) throw forbidden('super admin required')
			const { slug, name } = request.body
			if (await prisma.venue.findUnique({ where: { slug } })) throw conflict('venue slug already exists')
			const venue = await prisma.venue.create({
				data: {
					slug,
					name,
					timeZone: 'Asia/Makassar',
					tagline: '',
					intro: '',
					address: '',
					phone: '',
					whatsapp: '',
					email: '',
					mapsUrl: '',
					cancellationPolicy: '',
					feedbackMessageTemplate: "Hi {{guestName}}, thank you for dining with us at {{restaurantName}}. We'd love to hear about your experience: {{feedbackUrl}}",
				},
			})
			await prisma.auditEvent.create({
				data: { venueId: venue.id, actorType: 'user', actorUserId: session.user.id, action: 'venue.created', entityType: 'venue', entityId: venue.id },
			})
			return reply.status(201).send({ id: venue.id, slug, name })
		},
	)

	// ---- Admin: users -------------------------------------------------------
	app.get(
		'/admin/users',
		async (request: FastifyRequest<{ Querystring: { venueId?: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			if (!session.user.isSuperAdmin) throw forbidden('super admin required')
			const where = { ...(request.query.venueId ? { venueId: request.query.venueId } : {}), user: { isSuperAdmin: false } }
			const users = await prisma.userVenue.findMany({ where, include: { user: true }, orderBy: { user: { name: 'asc' } } })
			return users.map((uv) => ({
				id: uv.user.id,
				name: uv.user.name,
				login: uv.user.login,
				role: uv.role,
				active: uv.user.active,
				venueId: uv.venueId,
			}))
		},
	)

	app.post(
		'/admin/users',
		{
			schema: {
				body: {
					type: 'object',
					required: ['venueId', 'name', 'login', 'password', 'role'],
					properties: {
						venueId: { type: 'string', format: 'uuid' },
						name: { type: 'string', minLength: 1, maxLength: 120 },
						login: { type: 'string', minLength: 1, maxLength: 64 },
						password: { type: 'string', minLength: 12, maxLength: 200 },
						role: { type: 'string', enum: ['host', 'admin'] },
					},
				},
			},
		},
		async (request: FastifyRequest<{ Body: { venueId: string; name: string; login: string; password: string; role: string } }>, reply) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			if (!session.user.isSuperAdmin) throw forbidden('super admin required')
			const { venueId, name, password, role } = request.body
			const login = normalizeLogin(request.body.login)
			if (await prisma.user.findUnique({ where: { login } })) throw conflict('login already exists')
			const passwordHash = await hash(password)
			const user = await prisma.user.create({
				data: { name, login, passwordHash, venues: { create: { venueId, role: role as VenueRole } } },
			})
			await prisma.auditEvent.create({
				data: { venueId, actorType: 'user', actorUserId: session.user.id, action: 'user.created', entityType: 'user', entityId: user.id },
			})
			return reply.status(201).send({ id: user.id, name, login, role, active: true, venueId })
		},
	)

	app.put(
		'/admin/users',
		{
			schema: {
				body: {
					type: 'array',
					minItems: 1,
					items: {
						type: 'object',
						required: ['userId', 'venueId', 'role'],
						properties: {
							userId: { type: 'string', format: 'uuid' },
							venueId: { type: 'string', format: 'uuid' },
							role: { type: 'string', enum: ['host', 'admin'] },
							name: { type: 'string', minLength: 1, maxLength: 120 },
							login: { type: 'string', minLength: 1, maxLength: 64 },
							active: { type: 'boolean' },
							password: { type: 'string', minLength: 12, maxLength: 200 },
						},
					},
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: Array<{ userId: string; venueId: string; role: string; name?: string; login?: string; active?: boolean; password?: string }>
			}>,
		) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			if (!session.user.isSuperAdmin) throw forbidden('super admin required')

			await prisma.$transaction(async (tx) => {
				for (const row of request.body) {
					await tx.userVenue.upsert({
						where: { userId_venueId: { userId: row.userId, venueId: row.venueId } },
						update: { role: row.role as VenueRole },
						create: { userId: row.userId, venueId: row.venueId, role: row.role as VenueRole },
					})
					const { name, active, password } = row
					const login = row.login === undefined ? undefined : normalizeLogin(row.login)
					if (login !== undefined && (await tx.user.findFirst({ where: { login, NOT: { id: row.userId } }, select: { id: true } }))) throw conflict('login already exists')
					if (name !== undefined || login !== undefined || active !== undefined || password !== undefined) {
						const passwordHash = password === undefined ? undefined : await hash(password)
						await tx.user.update({ where: { id: row.userId }, data: { name, login, active, passwordHash } })
						if (passwordHash || active === false) await tx.session.deleteMany({ where: { userId: row.userId } })
					}
				}
				await tx.auditEvent.create({
					data: {
						venueId: request.body[0]?.venueId,
						actorType: 'user',
						actorUserId: session.user.id,
						action: 'user.updated',
						entityType: 'user',
					},
				})
			})
		},
	)

	app.delete(
		'/admin/users/:userId',
		{
			schema: {
				params: { type: 'object', required: ['userId'], properties: { userId: { type: 'string', format: 'uuid' } } },
				querystring: { type: 'object', required: ['venueId'], properties: { venueId: { type: 'string', format: 'uuid' } } },
			},
		},
		async (request: FastifyRequest<{ Params: { userId: string }; Querystring: { venueId: string } }>, reply) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			if (!session.user.isSuperAdmin) throw forbidden('super admin required')
			const { userId } = request.params
			const { venueId } = request.query
			const target = await prisma.user.findUnique({ where: { id: userId } })
			if (!target || target.isSuperAdmin) throw notFound('user not found')
			// Audit rows reference the user, so removal = unlink from the venue and deactivate once no venue is left.
			await prisma.$transaction(async (tx) => {
				await tx.userVenue.delete({ where: { userId_venueId: { userId, venueId } } })
				if ((await tx.userVenue.count({ where: { userId } })) === 0) await tx.user.update({ where: { id: userId }, data: { active: false } })
				await tx.session.deleteMany({ where: { userId } })
				await tx.auditEvent.create({
					data: { venueId, actorType: 'user', actorUserId: session.user.id, action: 'user.removed', entityType: 'user', entityId: userId },
				})
			})
			return reply.status(204).send()
		},
	)

	// ---- Admin: audit log ---------------------------------------------------
	app.get(
		'/admin/audit-log',
		async (request: FastifyRequest<{ Querystring: { venueId?: string; limit?: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			if (!session.user.isSuperAdmin) throw forbidden('super admin required')
			const where = request.query.venueId ? { venueId: request.query.venueId } : {}
			const limit = request.query.limit ? Math.min(1000, Math.max(1, Number(request.query.limit))) : 100
			const events = await prisma.auditEvent.findMany({
				where,
				include: { actorUser: true },
				orderBy: { at: 'desc' },
				take: limit,
			})
			return events.map((e) => ({
				id: e.id,
				at: e.at.toISOString(),
				actor: e.actorUser?.name ?? e.actorType,
				action: e.action,
				entityType: e.entityType,
				entityId: e.entityId,
				changes: e.changes,
				note: e.note,
			}))
		},
	)

	// ---- Admin: analytics ---------------------------------------------------
	app.get(
		'/admin/analytics',
		{
			schema: {
				querystring: {
					type: 'object',
					properties: {
						venueId: { type: 'string' },
						from: { type: 'string' },
						to: { type: 'string' },
						status: { type: 'string' },
						source: { type: 'string' },
						seatingAreaId: { type: 'string' },
						occasion: { type: 'string' },
					},
				},
			},
		},
		async (request: FastifyRequest<{
			Querystring: {
				venueId?: string
				from?: string
				to?: string
				status?: string
				source?: string
				seatingAreaId?: string
				occasion?: string
			}
		}>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const venueId = request.query.venueId ?? session.user.venueIds[0]
			if (!venueId) throw forbidden('no venue associated with this user')
			requireVenueAccess(session, venueId)
			requireAdmin(session, venueId)
			const { from, to } = request.query
			if (from && to && (from > to || (Date.parse(to) - Date.parse(from)) / 864e5 > 366)) throw new AppError(400, 'invalid date range', 'ERR_BAD_REQUEST')

			const venue = await prisma.venue.findUnique({
				where: { id: venueId },
				include: { openingHours: true, closedDates: true, seatingAreas: true },
			})
			if (!venue) throw notFound('venue not found')

			const settings = venueToSettings(venue)

			const today = localDate(new Date(), settings.timeZone)
			const rangeStart = request.query.from ?? addDays(today, -30)
			const rangeEnd = request.query.to ?? today

			// Live panels (today, next 7/30 days) need data outside the selected range
			const fromUtc = startOfLocalDay(rangeStart < today ? rangeStart : today, settings.timeZone)
			const toUtc = startOfNextLocalDay(rangeEnd > addDays(today, 30) ? rangeEnd : addDays(today, 30), settings.timeZone)

			const reservations = await prisma.reservation.findMany({
				where: {
					venueId,
					startsAt: { gte: fromUtc, lt: toUtc },
				},
				include: { guest: true },
				orderBy: { startsAt: 'asc' },
			})

			const domainReservations = reservations.map((r) => ({
				id: r.id,
				bookingCode: r.bookingCode,
				guestId: r.guestId,
				date: localDate(r.startsAt, settings.timeZone),
				time: localTime(r.startsAt, settings.timeZone),
				partySize: r.partySize,
				seatingAreaId: r.seatingAreaId,
				occasion: r.occasion ?? undefined,
				source: r.source,
				status: r.status,
				guestNotes: r.guestNotes ?? undefined,
				internalNotes: r.internalNotes ?? undefined,
				createdBy: r.createdById ?? 'system',
				createdAt: r.createdAt.toISOString(),
				updatedAt: r.updatedAt.toISOString(),
			}))

			const guests = (
				await prisma.guest.findMany({
					where: { venueId },
					select: {
						id: true,
						fullName: true,
						phone: true,
						email: true,
						country: true,
						allergies: true,
						accessibility: true,
						seatingPreference: true,
						notes: true,
						marketingConsent: true,
						marketingConsentAt: true,
						createdAt: true,
						updatedAt: true,
					},
				})
			).map((g) => ({
				id: g.id,
				fullName: g.fullName,
				phone: g.phone ?? '',
				email: g.email ?? undefined,
				country: g.country ?? undefined,
				allergies: g.allergies,
				accessibility: g.accessibility ?? undefined,
				seatingPreference: g.seatingPreference ?? undefined,
				notes: g.notes ?? undefined,
				marketingConsent: g.marketingConsent,
				marketingConsentAt: g.marketingConsentAt?.toISOString() ?? undefined,
				createdAt: g.createdAt.toISOString(),
				updatedAt: g.updatedAt.toISOString(),
			}))

			const feedback = await prisma.feedback.findMany({
				where: { venueId },
				orderBy: { submittedAt: 'desc' },
				include: {
					reservation: {
						select: {
							id: true,
							bookingCode: true,
							guestId: true,
							startsAt: true,
							partySize: true,
							seatingAreaId: true,
							source: true,
							occasion: true,
							guest: { select: { id: true, fullName: true, phone: true } },
						},
					},
				},
			})

			const feedbackItems = feedback.map((f) => {
				const r = f.reservation
				return {
					id: f.id,
					reservationId: f.reservationId,
					guestId: r.guestId,
					rating: f.rating,
					comments: f.comments,
					serviceTags: f.serviceTags,
					submittedAt: f.submittedAt.toISOString(),
					reservation: {
						id: r.id,
						bookingCode: r.bookingCode,
						guestId: r.guestId,
						date: localDate(r.startsAt, settings.timeZone),
						time: localTime(r.startsAt, settings.timeZone),
						partySize: r.partySize,
						seatingAreaId: r.seatingAreaId,
						source: r.source,
						occasion: r.occasion ?? undefined,
						guest: {
							id: r.guest.id,
							fullName: r.guest.fullName,
							phone: r.guest.phone ?? null,
						},
					},
				}
			})

			const filters: DashboardFilters = {
				rangeStart,
				rangeEnd,
				status: (request.query.status ?? 'all') as DashboardFilters['status'],
				source: (request.query.source ?? 'all') as DashboardFilters['source'],
				seatingAreaId: request.query.seatingAreaId ?? 'all',
				occasion: request.query.occasion ?? 'all',
			}

			const dashboard = dashboardData(settings, domainReservations, guests, today, filters)

			return {
				venueId,
				today,
				timeZone: settings.timeZone,
				settings,
				guests,
				feedback: feedbackItems,
				dashboard,
			}
		},
	)

	// ---- Admin: CSV export --------------------------------------------------
	app.get(
		'/admin/venues/:id/export.csv',
		async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			requireAdmin(session, request.params.id)
			const venue = await prisma.venue.findUniqueOrThrow({ where: { id: request.params.id }, select: { timeZone: true } })

			const reservations = await prisma.reservation.findMany({
				where: { venueId: request.params.id },
				include: { guest: true },
			})

			let csv = 'id,booking_code,guest_name,phone,email,party_size,date,time,status,allergies,accessibility\n'
			for (const r of reservations) {
				csv +=
					[
						r.id,
						r.bookingCode,
						r.guest.fullName,
						r.guest.phone ?? '',
						r.guest.email ?? '',
						r.partySize,
						localDate(r.startsAt, venue.timeZone),
						localTime(r.startsAt, venue.timeZone),
						r.status,
						(r.guest.allergies ?? []).join(';'),
						r.guest.accessibility ?? '',
					].map(csvEscape).join(',') + '\n'
			}

			reply.header('Content-Type', 'text/csv')
			reply.header('Content-Disposition', `attachment; filename=gioi-export-${request.params.id}.csv`)
			return csv
		},
	)

	// ---- Host/admin: CSV export of one day ----------------------------------
	app.get(
		'/staff/venues/:venueId/export.csv',
		{
			schema: {
				querystring: {
					type: 'object',
					required: ['date'],
					properties: { date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
				},
			},
		},
		async (request: FastifyRequest<{ Params: { venueId: string }; Querystring: { date: string } }>, reply) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const { venueId } = request.params
			const { date } = request.query
			requireVenueAccess(session, venueId)
			const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { timeZone: true } })
			if (!venue) throw notFound('venue not found')

			const reservations = await prisma.reservation.findMany({
				where: { venueId, startsAt: { gte: startOfLocalDay(date, venue.timeZone), lt: startOfNextLocalDay(date, venue.timeZone) } },
				include: { guest: true },
				orderBy: { startsAt: 'asc' },
			})

			let csv = 'booking_code,guest_name,phone,email,party_size,date,time,status,allergies,accessibility\n'
			for (const r of reservations) {
				csv +=
					[
						r.bookingCode,
						r.guest.fullName,
						r.guest.phone ?? '',
						r.guest.email ?? '',
						r.partySize,
						localDate(r.startsAt, venue.timeZone),
						localTime(r.startsAt, venue.timeZone),
						r.status,
						(r.guest.allergies ?? []).join(';'),
						r.guest.accessibility ?? '',
					].map(csvEscape).join(',') + '\n'
			}

			reply.header('Content-Type', 'text/csv')
			reply.header('Content-Disposition', `attachment; filename=gioi-reservations-${date}.csv`)
			return csv
		},
	)
}
