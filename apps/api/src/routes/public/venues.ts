import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { PrismaClient, OpeningHours, ClosedDate, SeatingArea, Reservation } from '@prisma/client'
import { notFound } from '../../lib/errors'
import { getDayAvailability, toUtc, type Settings } from '@gioi/domain'

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
				const h = Math.floor(oh.openMinute / 60)
					.toString()
					.padStart(2, '0')
				const m = String(oh.openMinute % 60).padStart(2, '0')
				const ch = Math.floor(oh.closeMinute / 60)
					.toString()
					.padStart(2, '0')
				const cm = String(oh.closeMinute % 60).padStart(2, '0')
				openingHours[String(oh.weekday)] = { open: `${h}:${m}`, close: `${ch}:${cm}` }
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
					properties: { date: { type: 'string' }, party: { type: 'string' } },
					required: ['date', 'party'],
				},
			},
		},
		async (
			request: FastifyRequest<{ Params: { slug: string }; Querystring: { date: string; party: string } }>,
			reply: FastifyReply,
		) => {
			const { slug } = request.params
			const { date, party } = request.query
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
					reservations: true,
				},
			})
			if (!venue) throw notFound('venue not found')

			const dayStart = toUtc(date, '00:00', venue.timeZone)
			const dayEnd = toUtc(date, '23:59', venue.timeZone)
			const dayReservations = venue.reservations.filter((r) => {
				const startsAt = r.startsAt instanceof Date ? r.startsAt : new Date(r.startsAt)
				return startsAt >= dayStart && startsAt <= dayEnd
			})

			const settings: Settings = {
				restaurant: {
					name: venue.name,
					tagline: venue.tagline,
					intro: venue.intro,
					address: venue.address,
					phone: venue.phone,
					whatsapp: venue.whatsapp,
					email: venue.email,
					mapsUrl: venue.mapsUrl,
				},
				timeZone: venue.timeZone,
				openingHours: Object.fromEntries(
					venue.openingHours.map((oh: OpeningHours) => {
						const day = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][oh.weekday]
						return [day, {
							open: String(Math.floor(oh.openMinute / 60)).padStart(2, '0') + ':' + String(oh.openMinute % 60).padStart(2, '0'),
							close: String(Math.floor(oh.closeMinute / 60)).padStart(2, '0') + ':' + String(oh.closeMinute % 60).padStart(2, '0'),
						}]
					}),
				) as Settings['openingHours'],
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
				})) as Settings['seatingAreas'],
				cancellationPolicy: venue.cancellationPolicy,
				feedbackMessageTemplate: venue.feedbackMessageTemplate,
			}

			const reservations = dayReservations.map((r: Reservation) => ({
				id: r.id,
				bookingCode: r.bookingCode,
				guestId: r.guestId,
				date: r.startsAt.toISOString().slice(0, 10),
				time: r.startsAt.toISOString().slice(11, 16),
				partySize: r.partySize,
				seatingAreaId: r.seatingAreaId,
				source: r.source,
				status: r.status,
				createdBy: r.createdById ?? 'guest',
				createdAt: r.startsAt.toISOString(),
				updatedAt: r.startsAt.toISOString(),
			}))

			const slots = getDayAvailability(settings, reservations, date, partySize, { now: new Date() })

			return { date, timeZone: venue.timeZone, slots }
		},
	)
}
