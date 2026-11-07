import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { PrismaClient, Prisma, VenueRole } from '@prisma/client'
import type { AuthedSession } from '../../lib/auth'
import type { ReservationStatus, Channel } from '@gioi/domain'
import { notFound, conflict, forbidden, unprocessable } from '../../lib/errors'
import { requireAuth, requireVenueAccess } from '../../lib/middleware'
import { canTransition, nextStatuses } from '@gioi/domain'

function staffVenue(session: AuthedSession, venueId?: string): string {
	const id = venueId ?? session.user.venueIds[0]
	if (!id) throw forbidden('no venue associated with this user')
	return id
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
			const date = request.query.date ?? new Date().toISOString().slice(0, 10)
			const venueId = staffVenue(session)
			requireVenueAccess(session, venueId)

			const dayStart = new Date(`${date}T00:00:00Z`)
			const dayEnd = new Date(`${date}T23:59:59Z`)
			const reservations = await prisma.reservation.findMany({
				where: { venueId, startsAt: { gte: dayStart, lte: dayEnd } },
				include: { guest: true, seatingArea: true },
				orderBy: [{ startsAt: 'asc' }],
			})
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
					guestName: r.guest.fullName,
					guestPhone: r.guest.phone ?? null,
					partySize: r.partySize,
					startsAt: r.startsAt.toISOString(),
					seatingArea: r.seatingArea.name,
					date: r.startsAt.toISOString().slice(0, 10),
					time: r.startsAt.toISOString().slice(11, 16),
					internalNotes: r.internalNotes ?? null,
					status: r.status,
					source: r.source,
					occasion: r.occasion ?? null,
					guestNotes: r.guestNotes ?? null,
					allergies: r.guest.allergies ?? [],
					accessibility: r.guest.accessibility ?? null,
				})),
				areas,
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
						partySize: { type: 'integer' },
						seatingAreaId: { type: 'string' },
						occasion: { type: 'string' },
						guestNotes: { type: 'string' },
						internalNotes: { type: 'string' },
						source: { type: 'string' },
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
			const venue = await prisma.venue.findUnique({ where: { id: venueId } })
			if (!venue) throw notFound('venue not found')

			const startsAt = new Date(`${body.date}T${body.time}:00`)
			await prisma.$transaction(async (tx) => {
				let areaId = typeof body.seatingAreaId === 'string' ? body.seatingAreaId : undefined
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

				const guest = await tx.guest.upsert({
					where: { venueId_phone: { venueId, phone: (body.phone as string | undefined) ?? '' } },
					update: { fullName: body.guestName as string, email: (body.email as string | undefined) ?? null },
					create: {
						venueId,
						fullName: body.guestName as string,
						phone: (body.phone as string | undefined) ?? null,
						email: (body.email as string | undefined) ?? null,
					},
				})

				const reservation = await tx.reservation.create({
					data: {
						venueId,
						bookingCode: require('crypto').randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase(),
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
				body: { type: 'object' },
			},
		},
		async (request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const body = request.body
			const reservation = await prisma.reservation.findUnique({ where: { id: request.params.id } })
			if (!reservation) throw notFound('reservation not found')
			requireVenueAccess(session, reservation.venueId)
			const role = session.user.venueRoles[reservation.venueId] ?? 'host'
			if (!session.user.isSuperAdmin && role !== 'host') throw forbidden('insufficient role')

			const updates: Record<string, unknown> = {}
			if (typeof body.partySize === 'number') updates.partySize = body.partySize
			if (typeof body.seatingAreaId === 'string') updates.seatingAreaId = body.seatingAreaId
			if (typeof body.startsAt === 'string') updates.startsAt = new Date(body.startsAt)
			if (typeof body.occasion === 'string') updates.occasion = body.occasion
			if (typeof body.guestNotes === 'string') updates.guestNotes = body.guestNotes
			if (typeof body.internalNotes === 'string') updates.internalNotes = body.internalNotes
			if (typeof body.source === 'string') updates.source = body.source
			if (Object.keys(updates).length > 0) updates.updatedAt = new Date()

			const original: Record<string, unknown> = {}
			for (const key of Object.keys(updates)) original[key] = (reservation as Record<string, unknown>)[key]

			const updated = await prisma.reservation.update({
				where: { id: reservation.id },
				data: updates as unknown as Prisma.ReservationUpdateInput,
			})

			const changed: Record<string, { from: unknown; to: unknown }> = {}
			for (const key of Object.keys(updates)) {
				changed[key] = { from: original[key], to: (updated as Record<string, unknown>)[key] }
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
				return { error: 'ERR_INVALID_TRANSITION', message: 'cannot transition status', statusCode: 409 }
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
					date: r.startsAt.toISOString().slice(0, 10),
					time: r.startsAt.toISOString().slice(11, 16),
					partySize: r.partySize,
					seatingArea: r.seatingArea.name,
					status: r.status,
					source: r.source,
					occasion: r.occasion ?? null,
					feedback: r.feedback
						? {
								rating: r.feedback.rating,
								comments: r.feedback.comments,
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
					OR: [
						q ? { fullName: { contains: q, mode: 'insensitive' as const } } : {},
						q ? { phone: { contains: q } } : {},
					].filter(Boolean),
				},
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
			}))
		},
	)

	// ---- Admin: venue settings ----------------------------------------------

	app.get(
		'/admin/venues/:id',
		async (request: FastifyRequest<{ Params: { id: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			const venue = await prisma.venue.findUnique({ where: { id: request.params.id } })
			if (!venue) throw notFound('venue not found')
			return venue
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
				'bookingIntervalMinutes', 'partyMin', 'partyMax', 'diningMinutes',
				'leadTimeMinutes', 'cutoffMinutes', 'noShowTargetPercent',
				'overCapacityAlertPercent', 'cancellationPolicy', 'feedbackTitle',
				'feedbackSubtitle', 'feedbackMessageTemplate',
			]
			const changes: Record<string, { from: unknown; to: unknown }> = {}
			const data: Record<string, unknown> = {}
			for (const key of updatable) {
				if (key in request.body) {
					changes[key] = { from: (venue as Record<string, unknown>)[key], to: request.body[key] }
					data[key] = request.body[key]
				}
			}
			if (Object.keys(data).length > 0) data.updatedAt = new Date()

			const updated = await prisma.venue.update({
				where: { id: request.params.id },
				data: data as unknown as Prisma.VenueUpdateInput,
			})

			await prisma.auditEvent.create({
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

			return updated
		},
	)

	// ---- Admin: opening hours -----------------------------------------------
	app.get(
		'/admin/venues/:id/opening-hours',
		async (request: FastifyRequest<{ Params: { id: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
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
			return prisma.closedDate.findMany({ where: { venueId: request.params.id }, orderBy: { date: 'asc' } })
		},
	)

	app.put(
		'/admin/venues/:id/closed-dates',
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

	// ---- Admin: seating areas -----------------------------------------------
	app.get(
		'/admin/venues/:id/seating-areas',
		async (request: FastifyRequest<{ Params: { id: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			return prisma.seatingArea.findMany({ where: { venueId: request.params.id }, orderBy: { name: 'asc' } })
		},
	)

	app.put(
		'/admin/venues/:id/seating-areas',
		async (
			request: FastifyRequest<{
				Params: { id: string }
				Body: Array<{
					id?: string
					name: string
					capacity: number
					bookable: boolean
					minParty?: number | null
					maxParty?: number | null
				}>
			}>,
		) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)
			if (!session.user.isSuperAdmin && session.user.venueRoles[request.params.id] !== 'admin') {
				throw forbidden('insufficient role')
			}

			await prisma.$transaction(async (tx) => {
				for (const row of request.body) {
					if (row.id) {
						await tx.seatingArea.update({
							where: { id: row.id },
							data: {
								name: row.name,
								capacity: row.capacity,
								bookable: row.bookable,
								minParty: row.minParty ?? null,
								maxParty: row.maxParty ?? null,
							},
						})
					} else {
						await tx.seatingArea.create({
							data: {
								venueId: request.params.id,
								name: row.name,
								capacity: row.capacity,
								bookable: row.bookable,
								minParty: row.minParty ?? null,
								maxParty: row.maxParty ?? null,
							},
						})
					}
				}
				await tx.auditEvent.create({
					data: {
						venueId: request.params.id,
						actorType: 'user',
						actorUserId: session.user.id,
						action: 'seating_area.updated',
						entityType: 'seating_area',
						entityId: request.params.id,
					},
				})
			})
			return prisma.seatingArea.findMany({ where: { venueId: request.params.id }, orderBy: { name: 'asc' } })
		},
	)

	// ---- Admin: users -------------------------------------------------------
	app.get(
		'/admin/users',
		async (request: FastifyRequest<{ Querystring: { venueId?: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			if (!session.user.isSuperAdmin) throw forbidden('super admin required')
			const where = request.query.venueId ? { venueId: request.query.venueId } : {}
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

	app.put(
		'/admin/users',
		async (
			request: FastifyRequest<{
				Body: Array<{ userId: string; venueId: string; role: string }>
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

	// ---- Admin: dashboard metrics -------------------------------------------
	app.get(
		'/admin/dashboard',
		async (request: FastifyRequest<{ Querystring: { venueId?: string; date?: string } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const venueId = request.query.venueId ?? session.user.venueIds[0]
			requireVenueAccess(session, venueId)
			const date = request.query.date ?? new Date().toISOString().slice(0, 10)

			const dayStart = new Date(`${date}T00:00:00Z`)
			const dayEnd = new Date(`${date}T23:59:59Z`)
			const reservations = await prisma.reservation.findMany({
				where: { venueId, startsAt: { gte: dayStart, lte: dayEnd } },
			})

			const total = reservations.length
			const covers = reservations.reduce((s, r) => s + r.partySize, 0)
			const byStatus: Record<string, number> = {}
			for (const r of reservations) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1

			return {
				venueId,
				date,
				bookings: total,
				expectedCovers: covers,
				arrivedCovers: reservations.filter((r) => r.status === 'arrived').reduce((s, r) => s + r.partySize, 0),
				seatedCovers: reservations.filter((r) => r.status === 'seated').reduce((s, r) => s + r.partySize, 0),
				completedCovers: reservations.filter((r) => r.status === 'completed').reduce((s, r) => s + r.partySize, 0),
				noShows: byStatus['no_show'] ?? 0,
				cancellations: byStatus['cancelled'] ?? 0,
				byStatus,
			}
		},
	)

	// ---- Admin: CSV export --------------------------------------------------
	app.get(
		'/admin/venues/:id/export.csv',
		async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			requireVenueAccess(session, request.params.id)

			const reservations = await prisma.reservation.findMany({
				where: { venueId: request.params.id },
				include: { guest: true },
			})

			const esc = (v: unknown) => {
				const s = String(v ?? '')
				if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
				return s
			}

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
						r.startsAt.toISOString().slice(0, 10),
						r.startsAt.toISOString().slice(11, 16),
						r.status,
						(r.guest.allergies ?? []).join(';'),
						r.guest.accessibility ?? '',
					].map(esc).join(',') + '\n'
			}

			reply.header('Content-Type', 'text/csv')
			reply.header('Content-Disposition', `attachment; filename=gioi-export-${request.params.id}.csv`)
			return csv
		},
	)
}
