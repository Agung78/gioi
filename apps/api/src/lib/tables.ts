import type { Prisma, ReservationStatus } from '@prisma/client'
import { conflict, unprocessable } from './errors'

export interface TableHolder {
	id: string
	tableId: string
	status: ReservationStatus
	startsAt: Date
	guestName: string
}

// Active reservations holding a table overlapping a booking at startsAt (same window as the area capacity check).
// excludeReservationId drops one reservation (the one being moved).
export async function tableHolders(db: Prisma.TransactionClient, venueId: string, startsAt: Date, diningMinutes: number, excludeReservationId?: string): Promise<TableHolder[]> {
	const rows = await db.reservation.findMany({
		where: {
			venueId,
			id: excludeReservationId ? { not: excludeReservationId } : undefined,
			tableId: { not: null },
			startsAt: { gt: new Date(startsAt.getTime() - diningMinutes * 60000), lt: new Date(startsAt.getTime() + diningMinutes * 60000) },
			status: { in: ['pending', 'confirmed', 'arrived', 'seated'] },
		},
		select: { id: true, tableId: true, status: true, startsAt: true, guest: { select: { fullName: true } } },
	})
	return rows.map((r) => ({ id: r.id, tableId: r.tableId!, status: r.status, startsAt: r.startsAt, guestName: r.guest.fullName }))
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

// A requested table decides the reservation's area. Call before locking the area.
export async function requestedTableArea(db: Prisma.TransactionClient, venueId: string, tableId: string, partySize: number, areaId?: string): Promise<string> {
	const table = await db.floorTable.findFirst({ where: { id: tableId, venueId }, select: { seatingAreaId: true, seats: true } })
	if (!table) throw unprocessable('unknown table')
	if (areaId && areaId !== table.seatingAreaId) throw unprocessable('table is not in that seating area')
	if (table.seats < partySize) throw unprocessable('table is too small')
	return table.seatingAreaId
}

// Call after the area row is locked. Returns the table to store: the requested one if free, else the
// smallest free table in the area that fits the party (null when none; area capacity still governs).
// A requested table held only by late holders is taken over (holders -> no_show) when takeOver is given.
export async function claimTable(
	db: Prisma.TransactionClient,
	venueId: string,
	areaId: string,
	startsAt: Date,
	diningMinutes: number,
	partySize: number,
	tableId?: string,
	opts: { excludeReservationId?: string; takeOver?: { graceMinutes: number; actorUserId: string } } = {},
): Promise<string | null> {
	const holders = await tableHolders(db, venueId, startsAt, diningMinutes, opts.excludeReservationId)
	if (tableId) {
		const mine = holders.filter((h) => h.tableId === tableId)
		if (mine.length > 0) {
			const { takeOver } = opts
			if (!takeOver || !mine.every((h) => isLate(h, takeOver.graceMinutes))) throw conflict('table taken')
			for (const h of mine) await markNoShow(db, venueId, h, takeOver.actorUserId)
		}
		return tableId
	}
	const held = new Set(holders.map((h) => h.tableId))
	const tables = await db.floorTable.findMany({ where: { venueId, seatingAreaId: areaId, seats: { gte: partySize } }, orderBy: [{ seats: 'asc' }, { id: 'asc' }], select: { id: true } })
	return tables.find((t) => !held.has(t.id))?.id ?? null
}
