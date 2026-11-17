import type { Prisma, ReservationStatus } from '@prisma/client'
import { hasRedundantTable } from '@gioi/domain'
import { conflict, unprocessable } from './errors'

export interface TableHolder {
	id: string
	tableId: string
	status: ReservationStatus
	startsAt: Date
	guestName: string
}

// Active reservations holding a table overlapping a booking at startsAt (same window as the area capacity check).
// Returns one TableHolder per held table so `tableId` keeps its per-table meaning. excludeReservationId drops
// one reservation (the one being moved).
export async function tableHolders(db: Prisma.TransactionClient, venueId: string, startsAt: Date, diningMinutes: number, excludeReservationId?: string): Promise<TableHolder[]> {
	const rows = await db.reservationTable.findMany({
		where: {
			reservation: {
				venueId,
				id: excludeReservationId ? { not: excludeReservationId } : undefined,
				startsAt: { gt: new Date(startsAt.getTime() - diningMinutes * 60000), lt: new Date(startsAt.getTime() + diningMinutes * 60000) },
				status: { in: ['pending', 'confirmed', 'arrived', 'seated'] },
			},
		},
		include: {
			reservation: { select: { id: true, status: true, startsAt: true, guest: { select: { fullName: true } } } },
		},
	})
	return rows.map((r) => ({ id: r.reservation.id, tableId: r.tableId, status: r.reservation.status, startsAt: r.reservation.startsAt, guestName: r.reservation.guest.fullName }))
}

// A holder who has not arrived and is past start + grace: staff may give the table away.
export function isLate(h: TableHolder, graceMinutes: number, now = new Date()): boolean {
	return (h.status === 'pending' || h.status === 'confirmed') && h.startsAt.getTime() + graceMinutes * 60000 <= now.getTime()
}

async function markNoShow(db: Prisma.TransactionClient, venueId: string, h: TableHolder, actorUserId: string): Promise<void> {
	const { count } = await db.reservation.updateMany({ where: { id: h.id, status: h.status }, data: { status: 'no_show' } })
	if (count === 0) throw conflict('concurrent update')
	const reason = 'table taken over by walk-in'
	await db.reservationStatusEvent.create({ data: { reservationId: h.id, fromStatus: h.status, toStatus: 'no_show', actorType: 'user', actorUserId, reason } })
	await db.auditEvent.create({
		data: {
			venueId,
			actorType: 'user',
			actorUserId,
			action: 'reservation.status_changed',
			entityType: 'reservation_status',
			entityId: h.id,
			changes: { status: { from: h.status, to: 'no_show' }, reason },
		},
	})
}

// The requested tables decide the reservation's area. Call before locking the area.
// Validates: unique ids, all in the venue, all in the same seating area, SUM(seats) >= partySize.
// Returns that area id.
export async function requestedTableArea(db: Prisma.TransactionClient, venueId: string, tableIds: string[], partySize: number, areaId?: string): Promise<string> {
	if (tableIds.length === 0) throw unprocessable('no tables')
	if (new Set(tableIds).size !== tableIds.length) throw unprocessable('duplicate table')
	const tables = await db.floorTable.findMany({ where: { id: { in: tableIds }, venueId }, select: { id: true, seatingAreaId: true, seats: true } })
	if (tables.length !== tableIds.length) throw unprocessable('unknown table')
	const areas = new Set(tables.map((t) => t.seatingAreaId))
	if (areas.size !== 1) throw unprocessable('tables are not in the same seating area')
	const area = tables[0]!.seatingAreaId
	if (areaId && areaId !== area) throw unprocessable('table is not in that seating area')
	const seats = tables.reduce((sum, t) => sum + t.seats, 0)
	if (seats < partySize) throw unprocessable('tables are too small')
	if (hasRedundantTable(tables.map((t) => t.seats), partySize)) throw unprocessable('too many tables for the party')
	return area
}

// Call after the area row is locked. Returns the chosen table ids: the requested set (validated for holds /
// takeover), else auto-assign [bestFit] or [] when no single free table fits the party.
// A requested table held only by late holders is taken over (holders -> no_show) when takeOver is given.
export async function claimTable(
	db: Prisma.TransactionClient,
	venueId: string,
	areaId: string,
	startsAt: Date,
	diningMinutes: number,
	partySize: number,
	tableIds?: string[],
	opts: { excludeReservationId?: string; takeOver?: { graceMinutes: number; actorUserId: string } } = {},
): Promise<string[]> {
	const holders = await tableHolders(db, venueId, startsAt, diningMinutes, opts.excludeReservationId)

	if (tableIds) {
		const mine = holders.filter((h) => tableIds.includes(h.tableId))
		if (mine.length > 0) {
			const { takeOver } = opts
			const lateHolders = mine.filter((h) => takeOver && isLate(h, takeOver.graceMinutes))
			if (!takeOver || mine.length !== lateHolders.length) throw conflict('table taken')
			const seen = new Set<string>()
			for (const h of mine) {
				if (seen.has(h.id)) continue
				seen.add(h.id)
				await markNoShow(db, venueId, h, takeOver!.actorUserId)
			}
		}
		return [...tableIds]
	}

	const held = new Set(holders.map((h) => h.tableId))
	const tables = await db.floorTable.findMany({ where: { venueId, seatingAreaId: areaId, seats: { gte: partySize } }, orderBy: [{ seats: 'asc' }, { id: 'asc' }], select: { id: true } })
	const fit = tables.find((t) => !held.has(t.id))
	return fit ? [fit.id] : []
}

// Mirrors the public booking check. Call after the area row is locked FOR UPDATE: active party sizes within
// ± diningMinutes of startsAt (excluding excludeReservationId) plus partySize must fit the area capacity.
export async function assertAreaCapacity(db: Prisma.TransactionClient, areaId: string, startsAt: Date, diningMinutes: number, partySize: number, excludeReservationId?: string): Promise<void> {
	const [{ capacity }, agg] = await Promise.all([
		db.seatingArea.findUniqueOrThrow({ where: { id: areaId }, select: { capacity: true } }),
		db.reservation.aggregate({
			where: {
				seatingAreaId: areaId,
				id: excludeReservationId ? { not: excludeReservationId } : undefined,
				startsAt: { gt: new Date(startsAt.getTime() - diningMinutes * 60000), lt: new Date(startsAt.getTime() + diningMinutes * 60000) },
				status: { in: ['pending', 'confirmed', 'arrived', 'seated'] },
			},
			_sum: { partySize: true },
		}),
	])
	if (Number(agg._sum.partySize ?? 0) + partySize > capacity) throw conflict('full')
}

export async function pickAreaForParty(
	db: Prisma.TransactionClient,
	venueId: string,
	startsAt: Date,
	partySize: number,
	diningMinutes: number,
	areas: Array<{ id: string; capacity: number; minParty?: number | null; maxParty?: number | null }>,
): Promise<string | null> {
	const before = new Date(startsAt.getTime() - diningMinutes * 60000)
	const after = new Date(startsAt.getTime() + diningMinutes * 60000)
	// Lock areas in id order to avoid deadlocks.
	await db.$queryRaw<{ id: string }[]>`
		SELECT id FROM seating_areas
		WHERE venue_id = ${venueId}::uuid AND bookable = true
		ORDER BY id
		FOR UPDATE`
	const usedByArea = await db.$queryRaw<{ area_id: string; used: string }[]>`
		SELECT seating_area_id AS area_id, coalesce(sum(party_size), 0)::text AS used
		FROM reservations
		WHERE venue_id = ${venueId}::uuid
		  AND starts_at > ${before}
		  AND starts_at < ${after}
		  AND status IN ('pending', 'confirmed', 'arrived', 'seated')
		GROUP BY seating_area_id`
	const usedMap = new Map(usedByArea.map((r) => [r.area_id, Number(r.used)]))
	let best: { id: string; remaining: number } | null = null
	for (const area of areas) {
		if (area.minParty != null && partySize < area.minParty) continue
		if (area.maxParty != null && partySize > area.maxParty) continue
		const remaining = area.capacity - (usedMap.get(area.id) ?? 0)
		if (remaining < partySize) continue
		if (!best || remaining < best.remaining) best = { id: area.id, remaining }
	}
	return best ? best.id : null
}
