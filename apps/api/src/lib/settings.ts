import type { Venue, OpeningHours, ClosedDate, SeatingArea } from '@prisma/client'
import { fromMinutes, type Settings } from '@gioi/domain'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function noticeDateOf(venue: { noticeDate: Date | null }): string | null {
	return venue.noticeDate ? venue.noticeDate.toISOString().slice(0, 10) : null
}

export function venueToSettings(
	venue: Venue & { openingHours: OpeningHours[]; closedDates: ClosedDate[]; seatingAreas: SeatingArea[] },
): Settings {
	return {
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
			venue.openingHours.map((oh) => [DAYS[oh.weekday], { open: fromMinutes(oh.openMinute), close: fromMinutes(oh.closeMinute) }]),
		) as Settings['openingHours'],
		closedDates: venue.closedDates.map((cd) => cd.date.toISOString().slice(0, 10)),
		bookingIntervalMinutes: venue.bookingIntervalMinutes,
		partySizeLimits: { min: venue.partyMin, max: venue.partyMax },
		diningMinutes: venue.diningMinutes,
		leadTimeMinutes: venue.leadTimeMinutes,
		cutoffMinutes: venue.cutoffMinutes,
		noShowTargetPercent: venue.noShowTargetPercent,
		overCapacityAlertPercent: venue.overCapacityAlertPercent,
		seatingAreas: venue.seatingAreas.map((a) => ({
			id: a.id,
			name: a.name,
			capacity: a.capacity,
			bookable: a.bookable,
			minParty: a.minParty ?? undefined,
			maxParty: a.maxParty ?? undefined,
		})) as Settings['seatingAreas'],
		cancellationPolicy: venue.cancellationPolicy,
		noticeEnabled: venue.noticeEnabled,
		noticeDate: noticeDateOf(venue),
		noticeText: venue.noticeText,
		feedbackMessageTemplate: venue.feedbackMessageTemplate,
	}
}
