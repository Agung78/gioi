// Loads prototype/src/mock/{guests,reservations,feedback}.json into Postgres,
// shifting dates so the mock anchor day (2026-09-30) becomes today in Bali.
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { prisma } from '../src/db'

const mock = (f: string) => JSON.parse(readFileSync(new URL(`../../../prototype/src/mock/${f}.json`, import.meta.url), 'utf8'))
const ANCHOR = '2026-09-30'
const AREA: Record<string, string> = { main: 'Main Hall', terrace: 'Sunset Terrace', counter: "Chef's Counter", beachfront: 'Beachfront Lounge' }

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
const shiftMs = Math.round((Date.parse(today) - Date.parse(ANCHOR)) / 86400000) * 86400000
const shiftIso = (iso: string) => new Date(Date.parse(iso) + shiftMs)
const shiftDay = (d: string) => new Date(Date.parse(d) + shiftMs).toISOString().slice(0, 10)

const venue = await prisma.venue.findUniqueOrThrow({ where: { slug: 'bali' } })
const areas = new Map((await prisma.seatingArea.findMany({ where: { venueId: venue.id } })).map((a) => [a.name, a.id]))
const host = await prisma.user.findUniqueOrThrow({ where: { login: 'host' } })

const guestIds = new Map<string, string>()
for (const g of mock('guests')) {
	const data = {
		fullName: g.fullName, email: g.email, country: g.country, allergies: g.allergies,
		accessibility: g.accessibility ?? null, seatingPreference: g.seatingPreference, notes: g.notes,
		marketingConsent: g.marketingConsent, marketingConsentAt: g.marketingConsentAt ? shiftIso(g.marketingConsentAt) : null,
	}
	const row = await prisma.guest.upsert({
		where: { venueId_phone: { venueId: venue.id, phone: g.phone } },
		update: data, create: { venueId: venue.id, phone: g.phone, ...data },
	})
	guestIds.set(g.id, row.id)
}

const resIds = new Map<string, string>()
const reservations: any[] = [], events: any[] = []
for (const r of mock('reservations')) {
	const id = randomUUID()
	resIds.set(r.id, id)
	reservations.push({
		id, venueId: venue.id, bookingCode: r.bookingCode, guestId: guestIds.get(r.guestId)!,
		seatingAreaId: areas.get(AREA[r.seatingAreaId])!,
		startsAt: new Date(`${shiftDay(r.date)}T${r.time}:00+08:00`), partySize: r.partySize,
		occasion: r.occasion ?? null, guestNotes: r.guestNotes ?? null, internalNotes: r.internalNotes ?? null,
		source: r.source, status: r.status, createdAt: shiftIso(r.createdAt), updatedAt: shiftIso(r.updatedAt),
	})
	for (const h of r.statusHistory) {
		events.push({
			reservationId: id, fromStatus: h.fromStatus, toStatus: h.toStatus,
			actorType: h.actorId === 'guest' ? 'guest' : 'user', actorUserId: h.actorId === 'guest' ? null : host.id, at: shiftIso(h.at),
		})
	}
}
// app role cannot DELETE history tables, so re-runs only add reservations not yet present
const have = new Set((await prisma.reservation.findMany({ select: { bookingCode: true } })).map((r) => r.bookingCode))
const fresh = new Set(reservations.filter((r) => !have.has(r.bookingCode)).map((r) => r.id))
reservations.splice(0, reservations.length, ...reservations.filter((r) => fresh.has(r.id)))
events.splice(0, events.length, ...events.filter((e) => fresh.has(e.reservationId)))
await prisma.reservation.createMany({ data: reservations })
await prisma.reservationStatusEvent.createMany({ data: events })
await prisma.feedback.createMany({
	data: mock('feedback').filter((f: any) => fresh.has(resIds.get(f.reservationId)!)).map((f: any) => ({
		venueId: venue.id, reservationId: resIds.get(f.reservationId)!, rating: f.rating,
		comments: f.comments, serviceTags: f.serviceTags, submittedAt: shiftIso(f.submittedAt),
	})),
})
console.log(`Loaded ${guestIds.size} guests, ${reservations.length} reservations, ${events.length} events; anchor -> ${today}`)
await prisma.$disconnect()
