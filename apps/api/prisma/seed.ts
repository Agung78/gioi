import { readFileSync } from 'node:fs'
import { PrismaClient } from '../src/generated/prisma/client'
import { prisma } from '../src/db'

const BALI_TIME_ZONE = 'Asia/Makassar'

const SETTINGS = {
	restaurant: {
		name: 'GIOI Ocean Gourmet',
		tagline: 'Coastal dining, modern Asian flavours, Kuta sunsets.',
		intro: 'A beachfront restaurant at Discovery Mall Bali, serving seafood, sharing plates and modern Asian flavours with Kuta Beach in view.',
		address: 'Ground Floor Beach Front, Discovery Mall Bali, Jl. Kartika Plaza, Kuta, Badung, Bali 80361, Indonesia',
		phone: '+62 811 3960 6101',
		whatsapp: '+62 811 3960 6101',
		email: 'ocean.kuta@gioigroup.com',
		mapsUrl: 'https://maps.google.com/?q=GIOI+Ocean+Gourmet+Kuta',
	},
	timeZone: BALI_TIME_ZONE,
	openingHours: {
		mon: { open: '10:00', close: '22:00' },
		tue: { open: '10:00', close: '22:00' },
		wed: { open: '10:00', close: '22:00' },
		thu: { open: '10:00', close: '22:00' },
		fri: { open: '10:00', close: '22:00' },
		sat: { open: '10:00', close: '22:00' },
		sun: { open: '10:00', close: '22:00' },
	},
	closedDates: ['2026-12-25', '2026-01-01'],
	bookingIntervalMinutes: 30,
	partySizeLimits: { min: 1, max: 8 },
	leadTimeMinutes: 60,
	cutoffMinutes: 120,
	noShowTargetPercent: 8,
	overCapacityAlertPercent: 85,
	seatingAreas: [
		{ name: 'Main Hall', capacity: 24, bookable: true },
		{ name: 'Sunset Terrace', capacity: 14, bookable: true, minParty: 2 },
		{ name: "Chef's Counter", capacity: 6, bookable: true, maxParty: 4 },
		{ name: 'Beachfront Lounge', capacity: 16, bookable: true, minParty: 2 },
	],
	cancellationPolicy: 'Please cancel or reschedule at least 4 hours before your booking. Late cancellations and no-shows may be charged a 200,000 IDR per-person fee.',
	feedbackTitle: 'How was your ocean dining experience?',
	feedbackSubtitle: 'Your thoughts help our kitchen and floor team make every Bali sunset visit memorable.',
	feedbackTags: [
		'Seafood freshness',
		'Sunset view',
		'Attentive service',
		'Cocktails & wine',
		'Atmosphere',
		'Pacing & timing',
		'Allergy care',
		'Value',
	],
	feedbackMessageTemplate: 'Hi {{guestName}}, thank you for dining with us at {{restaurantName}}. We\'d love to hear about your experience: {{feedbackUrl}}',
}

const DAYS_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const toMinutes = (time: string): number => {
	const [h, m] = time.split(':').map(Number)
	return h * 60 + m
}

async function upsertArea(venueId: string, area: (typeof SETTINGS.seatingAreas)[number]) {
	const existing = await prisma.seatingArea.findFirst({
		where: { venueId, name: area.name },
	})
	if (existing) {
		await prisma.seatingArea.update({
			where: { id: existing.id },
			data: {
				capacity: area.capacity,
				bookable: area.bookable,
				minParty: area.minParty ?? null,
				maxParty: area.maxParty ?? null,
			},
		})
		return existing.id
	}
	const created = await prisma.seatingArea.create({
		data: {
			venueId,
			name: area.name,
			capacity: area.capacity,
			bookable: area.bookable,
			minParty: area.minParty ?? null,
			maxParty: area.maxParty ?? null,
		},
	})
	return created.id
}

async function main() {
	const venue = await prisma.venue.upsert({
		where: { slug: 'bali' },
		update: {},
		create: {
			slug: 'bali',
			name: SETTINGS.restaurant.name,
			timeZone: BALI_TIME_ZONE,
			tagline: SETTINGS.restaurant.tagline,
			intro: SETTINGS.restaurant.intro,
			address: SETTINGS.restaurant.address,
			phone: SETTINGS.restaurant.phone,
			whatsapp: SETTINGS.restaurant.whatsapp,
			email: SETTINGS.restaurant.email,
			mapsUrl: SETTINGS.restaurant.mapsUrl,
			bookingIntervalMinutes: SETTINGS.bookingIntervalMinutes,
			partyMin: SETTINGS.partySizeLimits.min,
			partyMax: SETTINGS.partySizeLimits.max,
			diningMinutes: 120,
			leadTimeMinutes: SETTINGS.leadTimeMinutes,
			cutoffMinutes: SETTINGS.cutoffMinutes,
			noShowTargetPercent: SETTINGS.noShowTargetPercent,
			overCapacityAlertPercent: SETTINGS.overCapacityAlertPercent,
			cancellationPolicy: SETTINGS.cancellationPolicy,
			feedbackTitle: SETTINGS.feedbackTitle,
			feedbackSubtitle: SETTINGS.feedbackSubtitle,
			feedbackTags: SETTINGS.feedbackTags,
			feedbackMessageTemplate: SETTINGS.feedbackMessageTemplate,
		},
	})

	for (const [index, day] of DAYS_OF_WEEK.entries()) {
		const hours = SETTINGS.openingHours[day as keyof typeof SETTINGS.openingHours]
		await prisma.openingHours.upsert({
			where: { venueId_weekday: { venueId: venue.id, weekday: index } },
			update: {},
			create: {
				venueId: venue.id,
				weekday: index,
				openMinute: toMinutes(hours.open),
				closeMinute: toMinutes(hours.close),
			},
		})
	}

	for (const date of SETTINGS.closedDates) {
		await prisma.closedDate.upsert({
			where: { venueId_date: { venueId: venue.id, date: new Date(date) } },
			update: {},
			create: { venueId: venue.id, date: new Date(date), reason: 'Public holiday' },
		})
	}

	for (const area of SETTINGS.seatingAreas) {
		await upsertArea(venue.id, area)
	}

	// Store the Bali backdrop drawing once (never overwrite a super admin upload).
	const svg = readFileSync(new URL('./floor-plans/bali.svg', import.meta.url), 'utf8')
	await prisma.floorPlan.upsert({
		where: { venueId: venue.id },
		update: {},
		create: {
			venueId: venue.id,
			image: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'),
			width: 1200,
			height: 1525,
		},
	})

	const passwordHash = '$argon2id$v=19$m=19456,t=2,p=1$oWgJCzdk/VoFLiSMCyundQ$Kcal3mi3wX6l7HWQWbHuG/mI2bgriEAa+V6OZX8Y1jo'

	const admin = await prisma.user.upsert({
		where: { login: 'admin' },
		update: {},
		create: {
			login: 'admin',
			name: 'Super Admin',
			passwordHash,
			isSuperAdmin: true,
			active: true,
		},
	})
	await prisma.userVenue.upsert({
		where: { userId_venueId: { userId: admin.id, venueId: venue.id } },
		update: {},
		create: { userId: admin.id, venueId: venue.id, role: 'admin' },
	})

	const host = await prisma.user.upsert({
		where: { login: 'host' },
		update: {},
		create: {
			login: 'host',
			name: 'Host User',
			passwordHash,
			active: true,
		},
	})
	await prisma.userVenue.upsert({
		where: { userId_venueId: { userId: host.id, venueId: venue.id } },
		update: {},
		create: { userId: host.id, venueId: venue.id, role: 'host' },
	})

	// Venue admin without super-admin rights: edits the table layout, cannot upload the drawing.
	const venueAdmin = await prisma.user.upsert({
		where: { login: 'venueadmin' },
		update: {},
		create: { login: 'venueadmin', name: 'Venue Admin', passwordHash, active: true },
	})
	await prisma.userVenue.upsert({
		where: { userId_venueId: { userId: venueAdmin.id, venueId: venue.id } },
		update: {},
		create: { userId: venueAdmin.id, venueId: venue.id, role: 'admin' },
	})

	console.log(`Seeded venue ${venue.id} (${venue.slug})`)
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (e) => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})
