import { Prisma } from '../generated/prisma/client'
import type { PrismaClient } from '@prisma/client'
import { localDate, localTime, type ChannelPerformancePanel, DashboardFilters, GuestMixPanel, ReliabilityPanel } from '@gioi/domain'

// SQL twins of channelPerformancePanel / reliabilityPanel / guestMixPanel (packages/domain/src/analytics.ts).
// They return the same shapes, so the response contract is unchanged; only the work moved into Postgres.
// Status filter is deliberately ignored (as in dashboardData): rates are meaningless on a status subset.

export interface PeriodScope {
	venueId: string
	timeZone: string
	fromUtc: Date // inclusive start of first local day
	toUtc: Date // exclusive start of day after last local day
	filters: Pick<DashboardFilters, 'source' | 'occasion'>
}

const OCCASION = Prisma.sql`COALESCE(NULLIF(BTRIM(occasion, E' \t\r\n'), ''), 'No occasion')`

function where(s: PeriodScope) {
	const f = s.filters
	return Prisma.sql`venue_id = ${s.venueId}::uuid AND starts_at >= ${s.fromUtc} AND starts_at < ${s.toUtc}
		${f.source !== 'all' ? Prisma.sql`AND source = ${f.source}::reservation_channel` : Prisma.empty}
		${f.occasion !== 'all' ? Prisma.sql`AND ${OCCASION} = ${f.occasion}` : Prisma.empty}`
}

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100))

export async function channelAndReliability(
	prisma: PrismaClient,
	s: PeriodScope,
): Promise<{ channel: ChannelPerformancePanel; reliability: ReliabilityPanel }> {
	const w = where(s)
	const [channelRows, dayRows] = await Promise.all([
		prisma.$queryRaw<{ channel: string; bookings: number; covers: number }[]>`
			SELECT source::text AS channel, count(*)::int AS bookings, COALESCE(sum(party_size), 0)::int AS covers
			FROM reservations WHERE ${w} AND status <> 'cancelled' GROUP BY source`,
		prisma.$queryRaw<{ date: string; total: number; no: number; cx: number; lead_sum: number; lead_cnt: number }[]>`
			SELECT to_char((starts_at AT TIME ZONE ${s.timeZone})::date, 'YYYY-MM-DD') AS date,
				(count(*) FILTER (WHERE status <> 'pending'))::int AS total,
				(count(*) FILTER (WHERE status = 'no_show'))::int AS no,
				(count(*) FILTER (WHERE status = 'cancelled'))::int AS cx,
				COALESCE(sum(EXTRACT(EPOCH FROM starts_at - created_at)) FILTER (WHERE starts_at > created_at), 0)::float8 AS lead_sum,
				(count(*) FILTER (WHERE starts_at > created_at))::int AS lead_cnt
			FROM reservations WHERE ${w} GROUP BY 1 ORDER BY 1`,
	])

	const totalBookings = channelRows.reduce((a, r) => a + r.bookings, 0)
	const totalCovers = channelRows.reduce((a, r) => a + r.covers, 0)
	const rows = channelRows
		.map((r) => ({ channel: r.channel, bookings: r.bookings, covers: r.covers, share: pct(r.bookings, totalBookings) }))
		.sort((a, b) => b.bookings - a.bookings)

	let total = 0, noShows = 0, cancellations = 0, leadSum = 0, leadCnt = 0
	for (const d of dayRows) {
		total += d.total; noShows += d.no; cancellations += d.cx; leadSum += d.lead_sum; leadCnt += d.lead_cnt
	}
	const byDay = dayRows
		.filter((d) => d.total > 0) // days with only pending rows never appeared in the JS version
		.map((d) => ({ date: d.date, noShowRate: pct(d.no, d.total), cancellationRate: pct(d.cx, d.total) }))

	return {
		channel: { rows, totalBookings, totalCovers },
		reliability: {
			totalRealised: total,
			noShows,
			cancellations,
			noShowRate: pct(noShows, total),
			cancellationRate: pct(cancellations, total),
			averageLeadTimeHours: leadCnt === 0 ? 0 : Math.round((leadSum / leadCnt / 3600) * 10) / 10,
			byDay,
		},
	}
}

export async function guestMix(prisma: PrismaClient, s: PeriodScope, totalGuests: number): Promise<GuestMixPanel> {
	const w = where(s)
	const [[visits], occasionRows, bucketRows] = await Promise.all([
		prisma.$queryRaw<{ first: number; repeat: number }[]>`
			SELECT (count(*) FILTER (WHERE v = 1))::int AS first, (count(*) FILTER (WHERE v > 1))::int AS repeat
			FROM (SELECT count(*) AS v FROM reservations
				WHERE ${w} AND status IN ('arrived', 'seated', 'completed', 'no_show') GROUP BY guest_id) g`,
		prisma.$queryRaw<{ occasion: string; covers: number }[]>`
			SELECT ${OCCASION} AS occasion, sum(party_size)::int AS covers
			FROM reservations WHERE ${w} AND status IN ('arrived', 'seated', 'completed')
			GROUP BY 1 ORDER BY 2 DESC`,
		prisma.$queryRaw<{ bucket: string; bookings: number }[]>`
			SELECT CASE WHEN party_size <= 2 THEN '1–2' WHEN party_size <= 4 THEN '3–4' WHEN party_size <= 6 THEN '5–6'
				WHEN party_size <= 8 THEN '7–8' ELSE '9+' END AS bucket, count(*)::int AS bookings
			FROM reservations WHERE ${w} AND status IN ('arrived', 'seated', 'completed') GROUP BY 1`,
	])
	const firstTimers = visits?.first ?? 0
	const repeatGuests = visits?.repeat ?? 0
	const order = ['1–2', '3–4', '5–6', '7–8', '9+']
	return {
		totalGuests,
		firstTimers,
		repeatGuests,
		retentionShare: pct(repeatGuests, firstTimers + repeatGuests),
		occasionMix: occasionRows,
		partySizeMix: order.flatMap((b) => bucketRows.filter((r) => r.bucket === b)),
	}
}

// ---- Feedback: keyset-paged list + SQL summary --------------------------------

export const FEEDBACK_PAGE = 10

const encodeCursor = (at: Date, id: string) => Buffer.from(`${at.toISOString()}|${id}`).toString('base64url')

/** Returns null for a malformed cursor. */
function decodeCursor(c: string): { at: Date; id: string } | null {
	const [at, id] = Buffer.from(c, 'base64url').toString().split('|')
	const d = new Date(at)
	return id && !Number.isNaN(d.getTime()) ? { at: d, id } : null
}

/** One page of feedback ordered (submitted_at DESC, id DESC); `cursor` is the previous page's `nextCursor`. */
export async function feedbackPage(
	prisma: PrismaClient,
	s: Pick<PeriodScope, 'venueId' | 'timeZone' | 'fromUtc' | 'toUtc'>,
	cursor?: string,
) {
	const c = cursor ? decodeCursor(cursor) : null
	if (cursor && !c) return null
	const rows = await prisma.feedback.findMany({
		where: {
			venueId: s.venueId,
			submittedAt: { gte: s.fromUtc, lt: s.toUtc },
			...(c ? { OR: [{ submittedAt: { lt: c.at } }, { submittedAt: c.at, id: { lt: c.id } }] } : {}),
		},
		orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
		take: FEEDBACK_PAGE + 1,
		include: {
			reservation: {
				select: {
					id: true, bookingCode: true, guestId: true, startsAt: true, partySize: true, seatingAreaId: true, source: true, occasion: true,
					guest: { select: { id: true, fullName: true, phone: true } },
				},
			},
		},
	})
	const page = rows.slice(0, FEEDBACK_PAGE)
	const last = page[page.length - 1]
	return {
		items: page.map((f) => {
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
					date: localDate(r.startsAt, s.timeZone),
					time: localTime(r.startsAt, s.timeZone),
					partySize: r.partySize,
					seatingAreaId: r.seatingAreaId,
					source: r.source,
					occasion: r.occasion ?? undefined,
					guest: { id: r.guest.id, fullName: r.guest.fullName, phone: r.guest.phone ?? null },
				},
			}
		}),
		nextCursor: rows.length > FEEDBACK_PAGE && last ? encodeCursor(last.submittedAt, last.id) : null,
	}
}

/** Whole-range feedback stats, not just the loaded page. */
export async function feedbackSummary(prisma: PrismaClient, s: Pick<PeriodScope, 'venueId' | 'fromUtc' | 'toUtc'>) {
	const range = Prisma.sql`venue_id = ${s.venueId}::uuid AND submitted_at >= ${s.fromUtc} AND submitted_at < ${s.toUtc}`
	const [ratings, tags] = await Promise.all([
		prisma.$queryRaw<{ rating: number; n: number }[]>`SELECT rating::int AS rating, count(*)::int AS n FROM feedback WHERE ${range} GROUP BY rating`,
		prisma.$queryRaw<{ tag: string; n: number }[]>`
			SELECT t AS tag, count(*)::int AS n FROM feedback, unnest(service_tags) AS t WHERE ${range} GROUP BY t ORDER BY n DESC, t LIMIT 8`,
	])
	const count = ratings.reduce((a, r) => a + r.n, 0)
	const sum = ratings.reduce((a, r) => a + r.n * r.rating, 0)
	return {
		count,
		average: count === 0 ? null : Math.round((sum / count) * 10) / 10,
		distribution: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: ratings.find((r) => r.rating === rating)?.n ?? 0 })),
		tags: tags.map((t) => ({ tag: t.tag, count: t.n })),
	}
}
