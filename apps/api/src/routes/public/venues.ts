import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { PrismaClient, OpeningHours, ClosedDate, SeatingArea, Reservation } from '@prisma/client'
import { notFound } from '../../lib/errors'
import { venueToSettings, noticeDateOf } from '../../lib/settings'
import { fromMinutes, getDayAvailability, localDate, localTime, toUtc, type TableAvailability } from '@gioi/domain'
import { tableHolders } from '../../lib/tables'

export function registerPublicVenueRoutes(app: FastifyInstance, prisma: PrismaClient): void {
	app.get(
		'/public/venues/:slug',
		{
			schema: {
				params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
				querystring: { type: 'object' },
			},
		},
		async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
			const { slug } = request.params
			const venue = await prisma.venue.findUnique({
				where: { slug },
				include: {
					openingHours: true,
					closedDates: true,
					seatingAreas: true,
				},
			})
			if (!venue) throw notFound('venue not found')

			const openingHours: Record<string, { open: string; close: string }> = {}
			for (const oh of venue.openingHours as OpeningHours[]) {
				openingHours[String(oh.weekday)] = { open: fromMinutes(oh.openMinute), close: fromMinutes(oh.closeMinute) }
			}

			return {
				id: venue.id,
				slug: venue.slug,
				name: venue.name,
				tagline: venue.tagline,
				intro: venue.intro,
				address: venue.address,
				phone: venue.phone,
				whatsapp: venue.whatsapp,
				email: venue.email,
				mapsUrl: venue.mapsUrl,
				timeZone: venue.timeZone,
				openingHours,
				closedDates: venue.closedDates.map((cd: ClosedDate) => cd.date.toISOString().slice(0, 10)),
				bookingIntervalMinutes: venue.bookingIntervalMinutes,
				partySizeLimits: { min: venue.partyMin, max: venue.partyMax },
				diningMinutes: venue.diningMinutes,
				leadTimeMinutes: venue.leadTimeMinutes,
				cutoffMinutes: venue.cutoffMinutes,
				noShowTargetPercent: venue.noShowTargetPercent,
				overCapacityAlertPercent: venue.overCapacityAlertPercent,
				seatingAreas: venue.seatingAreas.map((a: SeatingArea) => ({
					id: a.id,
					name: a.name,
					capacity: a.capacity,
					bookable: a.bookable,
					minParty: a.minParty ?? undefined,
					maxParty: a.maxParty ?? undefined,
				})),
				cancellationPolicy: venue.cancellationPolicy,
				noticeEnabled: venue.noticeEnabled,
				noticeDate: noticeDateOf(venue),
				noticeText: venue.noticeText,
				feedbackTitle: venue.feedbackTitle,
				feedbackSubtitle: venue.feedbackSubtitle,
				feedbackTags: venue.feedbackTags,
			}
		},
	)

	app.get(
		'/public/venues/:slug/availability',
		{
			schema: {
				params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
				querystring: {
					type: 'object',
					properties: { date: { type: 'string' }, party: { type: 'string' },
					area: { type: 'string', format: 'uuid' } },
					required: ['date', 'party'],
				},
			},
		},
		async (
			request: FastifyRequest<{ Params: { slug: string }; Querystring: { date: string; party: string; area?: string } }>,
			reply: FastifyReply,
		) => {
			const { slug } = request.params
			const { date, party, area } = request.query
			const partySize = Number(party)
			if (!Number.isInteger(partySize) || partySize < 1) {
				return reply.status(400).send({ error: 'ERR_BAD_REQUEST', message: 'party must be a positive integer' })
			}

			const venue = await prisma.venue.findUnique({
				where: { slug },
				include: {
					openingHours: true,
					closedDates: true,
					seatingAreas: true,
				},
			})
			if (!venue) throw notFound('venue not found')

			const dayStart = toUtc(date, '00:00', venue.timeZone)
			const dayEnd = toUtc(date, '23:59', venue.timeZone)
			const dayReservations = await prisma.reservation.findMany({
				where: { venueId: venue.id, startsAt: { gte: dayStart, lte: dayEnd } },
			})

			const settings = venueToSettings(venue)

			const reservations = dayReservations.map((r: Reservation) => ({
				id: r.id,
				bookingCode: r.bookingCode,
				guestId: r.guestId,
				date: localDate(r.startsAt, venue.timeZone),
				time: localTime(r.startsAt, venue.timeZone),
				partySize: r.partySize,
				seatingAreaId: r.seatingAreaId,
				source: r.source,
				status: r.status,
				createdBy: r.createdById ?? 'guest',
				createdAt: r.startsAt.toISOString(),
				updatedAt: r.startsAt.toISOString(),
			}))

			const slots = getDayAvailability(settings, reservations, date, partySize, { now: new Date(), seatingAreaId: area })

			return { date, timeZone: venue.timeZone, slots }
		},
	)

	app.get(
		'/public/venues/:slug/table-availability',
		{
			schema: {
				params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
				querystring: {
					type: 'object',
					properties: {
						date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
						time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
						partySize: { type: 'integer', minimum: 1 },
					},
					required: ['date', 'time', 'partySize'],
				},
			},
		},
		async (request: FastifyRequest<{ Params: { slug: string }; Querystring: { date: string; time: string; partySize: number } }>): Promise<TableAvailability> => {
			const { date, time, partySize } = request.query
			const venue = await prisma.venue.findUnique({ where: { slug: request.params.slug }, select: { id: true, timeZone: true, diningMinutes: true } })
			if (!venue) throw notFound('venue not found')

			const held = (await tableHolders(prisma, venue.id, toUtc(date, time, venue.timeZone), venue.diningMinutes)).map((h) => h.tableId)
			const small = await prisma.floorTable.findMany({ where: { venueId: venue.id, seats: { lt: partySize } }, select: { id: true } })
			return { unavailableTableIds: [...new Set([...held, ...small.map((t) => t.id)])] }
		},
	)
}
