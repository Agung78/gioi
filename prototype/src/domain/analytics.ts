// Pure analytics — the 5 dashboard panels from scope §9 + action cues.

import type { Guest, Reservation, Settings } from './types'
import {
  reservedCovers,
  remainingCapacityForParty,
} from './availability'
import { addDays, daysBetween, fromISODate, todayISO, toISODate } from './dates'

const VISIT_STATUSES = new Set(['arrived', 'seated', 'completed', 'no_show'])

export interface TodayLivePanel {
  date: string
  bookings: number
  expectedCovers: number
  arrivedCovers: number
  seatedCovers: number
  completedCovers: number
  remainingCovers: number
  noShows: number
  cancellations: number
  occupancyPercent: number
}

export function todayLivePanel(
  settings: Settings,
  reservations: Reservation[],
  date: string = todayISO(),
): TodayLivePanel {
  const todays = reservations.filter((r) => r.date === date)
  const totalCapacity = settings.seatingAreas.reduce((sum, a) => sum + (a.bookable ? a.capacity : 0), 0)
  const expected = todays
    .filter((r) => ['pending', 'confirmed', 'arrived', 'seated', 'completed'].includes(r.status))
    .reduce((s, r) => s + r.partySize, 0)
  const arrived = todays.filter((r) => ['arrived', 'seated', 'completed'].includes(r.status)).reduce((s, r) => s + r.partySize, 0)
  const seated = todays.filter((r) => ['seated', 'completed'].includes(r.status)).reduce((s, r) => s + r.partySize, 0)
  const completed = todays.filter((r) => r.status === 'completed').reduce((s, r) => s + r.partySize, 0)
  return {
    date,
    bookings: todays.length,
    expectedCovers: expected,
    arrivedCovers: arrived,
    seatedCovers: seated,
    completedCovers: completed,
    remainingCovers: Math.max(totalCapacity - expected, 0),
    noShows: todays.filter((r) => r.status === 'no_show').length,
    cancellations: todays.filter((r) => r.status === 'cancelled').length,
    occupancyPercent: totalCapacity === 0 ? 0 : Math.round((expected / totalCapacity) * 100),
  }
}

export interface UpcomingDay {
  date: string
  covers: number
  bookings: number
  fillPercent: number
}

export interface UpcomingPanel {
  startDate: string
  days: number
  daysBreakdown: UpcomingDay[]
  busiestSlot: { time: string; covers: number } | null
  totalCovers: number
}

export function upcomingDaysPanel(
  settings: Settings,
  reservations: Reservation[],
  startDate: string = todayISO(),
  days: 7 | 30 = 7,
): UpcomingPanel {
  const endDate = addDays(startDate, days - 1)
  const totalCapacity = settings.seatingAreas.reduce((sum, a) => sum + (a.bookable ? a.capacity : 0), 0)

  const dayMap: Record<string, UpcomingDay> = {}
  for (let i = 0; i < days; i++) {
    const d = addDays(startDate, i)
    dayMap[d] = { date: d, covers: 0, bookings: 0, fillPercent: 0 }
  }

  let totalCovers = 0
  for (const r of reservations) {
    if (r.date < startDate || r.date > endDate) continue
    if (!['pending', 'confirmed', 'arrived', 'seated', 'completed'].includes(r.status)) continue
    const entry = dayMap[r.date]
    if (!entry) continue
    entry.covers += r.partySize
    entry.bookings += 1
    totalCovers += r.partySize
  }

  for (const entry of Object.values(dayMap)) {
    entry.fillPercent = totalCapacity === 0 ? 0 : Math.round((entry.covers / totalCapacity) * 100)
  }

  // busiest slot: any time with the most covers
  const slotCounts: Record<string, number> = {}
  for (const r of reservations) {
    if (r.date < startDate || r.date > endDate) continue
    if (!['pending', 'confirmed', 'arrived', 'seated', 'completed'].includes(r.status)) continue
    slotCounts[r.time] = (slotCounts[r.time] ?? 0) + r.partySize
  }
  let busiestSlot: UpcomingPanel['busiestSlot'] = null
  for (const [time, covers] of Object.entries(slotCounts)) {
    if (!busiestSlot || covers > busiestSlot.covers) busiestSlot = { time, covers }
  }

  return {
    startDate,
    days,
    daysBreakdown: Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)),
    busiestSlot,
    totalCovers,
  }
}

export interface GuestMixPanel {
  totalGuests: number
  firstTimers: number
  repeatGuests: number
  retentionShare: number
  occasionMix: { occasion: string; covers: number }[]
  partySizeMix: { bucket: string; bookings: number }[]
}

export function guestMixPanel(
  reservations: Reservation[],
  guests: Guest[],
  rangeStart?: string,
  rangeEnd?: string,
): GuestMixPanel {
  const inRange = reservations.filter((r) => {
    if (rangeStart && r.date < rangeStart) return false
    if (rangeEnd && r.date > rangeEnd) return false
    return r.status === 'completed' || r.status === 'seated' || r.status === 'arrived'
  })

  const visitsByGuest = new Map<string, number>()
  for (const r of reservations) {
    if (!VISIT_STATUSES.has(r.status)) continue
    visitsByGuest.set(r.guestId, (visitsByGuest.get(r.guestId) ?? 0) + 1)
  }

  const firstTimers = [...visitsByGuest.values()].filter((v) => v === 1).length
  const repeatGuests = [...visitsByGuest.values()].filter((v) => v > 1).length
  const total = firstTimers + repeatGuests

  const occasionCounts: Record<string, number> = {}
  for (const r of inRange) {
    const key = r.occasion?.trim() || 'No occasion'
    occasionCounts[key] = (occasionCounts[key] ?? 0) + r.partySize
  }
  const occasionMix = Object.entries(occasionCounts)
    .map(([occasion, covers]) => ({ occasion, covers }))
    .sort((a, b) => b.covers - a.covers)

  const bucketize = (n: number) => {
    if (n <= 2) return '1–2'
    if (n <= 4) return '3–4'
    if (n <= 6) return '5–6'
    if (n <= 8) return '7–8'
    return '9+'
  }
  const bucketCounts: Record<string, number> = {}
  for (const r of inRange) {
    const b = bucketize(r.partySize)
    bucketCounts[b] = (bucketCounts[b] ?? 0) + 1
  }
  const partyOrder = ['1–2', '3–4', '5–6', '7–8', '9+']
  const partySizeMix = partyOrder
    .filter((b) => bucketCounts[b])
    .map((bucket) => ({ bucket, bookings: bucketCounts[bucket] }))

  return {
    totalGuests: guests.length,
    firstTimers,
    repeatGuests,
    retentionShare: total === 0 ? 0 : Math.round((repeatGuests / total) * 100),
    occasionMix,
    partySizeMix,
  }
}

export interface ChannelRow {
  channel: string
  bookings: number
  covers: number
  share: number
}

export interface ChannelPerformancePanel {
  rows: ChannelRow[]
  totalBookings: number
  totalCovers: number
}

export function channelPerformancePanel(
  reservations: Reservation[],
  rangeStart?: string,
  rangeEnd?: string,
): ChannelPerformancePanel {
  const inRange = reservations.filter((r) => {
    if (rangeStart && r.date < rangeStart) return false
    if (rangeEnd && r.date > rangeEnd) return false
    return r.status !== 'cancelled'
  })
  const counts: Record<string, { bookings: number; covers: number }> = {}
  for (const r of inRange) {
    counts[r.source] ??= { bookings: 0, covers: 0 }
    counts[r.source].bookings += 1
    counts[r.source].covers += r.partySize
  }
  const totalBookings = Object.values(counts).reduce((s, c) => s + c.bookings, 0)
  const totalCovers = Object.values(counts).reduce((s, c) => s + c.covers, 0)
  const rows = Object.entries(counts)
    .map(([channel, c]) => ({
      channel,
      bookings: c.bookings,
      covers: c.covers,
      share: totalBookings === 0 ? 0 : Math.round((c.bookings / totalBookings) * 100),
    }))
    .sort((a, b) => b.bookings - a.bookings)
  return { rows, totalBookings, totalCovers }
}

export interface ReliabilityPanel {
  totalRealised: number
  noShows: number
  cancellations: number
  noShowRate: number
  cancellationRate: number
  averageLeadTimeHours: number
  byDay: { date: string; noShowRate: number; cancellationRate: number }[]
}

export function reliabilityPanel(
  reservations: Reservation[],
  rangeStart?: string,
  rangeEnd?: string,
): ReliabilityPanel {
  const inRange = reservations.filter((r) => {
    if (rangeStart && r.date < rangeStart) return false
    if (rangeEnd && r.date > rangeEnd) return false
    return r.status !== 'pending'
  })
  const total = inRange.length
  const noShows = inRange.filter((r) => r.status === 'no_show').length
  const cancellations = inRange.filter((r) => r.status === 'cancelled').length
  // Lead time: ms between createdAt and the slot datetime
  let leadSum = 0
  let leadCount = 0
  for (const r of reservations) {
    if (rangeStart && r.date < rangeStart) continue
    if (rangeEnd && r.date > rangeEnd) continue
    const created = new Date(r.createdAt).getTime()
    const slot = new Date(`${r.date}T${r.time}:00`).getTime()
    const diff = slot - created
    if (diff > 0) {
      leadSum += diff
      leadCount += 1
    }
  }
  const byDayMap: Record<string, { no: number; total: number; cx: number }> = {}
  for (const r of inRange) {
    byDayMap[r.date] ??= { no: 0, total: 0, cx: 0 }
    byDayMap[r.date].total += 1
    if (r.status === 'no_show') byDayMap[r.date].no += 1
    if (r.status === 'cancelled') byDayMap[r.date].cx += 1
  }
  const byDay = Object.entries(byDayMap)
    .map(([date, v]) => ({
      date,
      noShowRate: v.total === 0 ? 0 : Math.round((v.no / v.total) * 100),
      cancellationRate: v.total === 0 ? 0 : Math.round((v.cx / v.total) * 100),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalRealised: total,
    noShows,
    cancellations,
    noShowRate: total === 0 ? 0 : Math.round((noShows / total) * 100),
    cancellationRate: total === 0 ? 0 : Math.round((cancellations / total) * 100),
    averageLeadTimeHours: leadCount === 0 ? 0 : Math.round((leadSum / leadCount / 3600000) * 10) / 10,
    byDay,
  }
}

export type ActionCueKind =
  | 'slot_over_capacity'
  | 'no_show_rate_high'
  | 'cancellation_rate_high'
  | 'allergy_repeat_today'

export interface ActionCue {
  kind: ActionCueKind
  message: string
  severity: 'warn' | 'danger'
  reservationId?: string
  guestId?: string
  date?: string
  time?: string
}

export function actionCues(
  settings: Settings,
  reservations: Reservation[],
  guests: Guest[],
  date: string = todayISO(),
): ActionCue[] {
  const cues: ActionCue[] = []

  // Slot over capacity threshold — check each slot today
  for (const r of reservations.filter((r) => r.date === date)) {
    const fit = remainingCapacityForParty(settings, reservations, r.date, r.time, r.partySize)
    const used = reservedCovers(reservations, r.date, r.time, r.seatingAreaId)
    const area = settings.seatingAreas.find((a) => a.id === r.seatingAreaId)
    if (!area) continue
    const pct = Math.round((used / area.capacity) * 100)
    if (pct >= settings.overCapacityAlertPercent) {
      cues.push({
        kind: 'slot_over_capacity',
        severity: pct >= 100 ? 'danger' : 'warn',
        message: `${area.name} at ${r.time} is at ${pct}% capacity`,
        reservationId: r.id,
        date: r.date,
        time: r.time,
      })
    }
    // suppress unused var warning
    void fit
  }

  // No-show rate above target (last 30 days)
  const start = addDays(date, -30)
  const rel = reliabilityPanel(reservations, start, date)
  if (rel.noShowRate > settings.noShowTargetPercent && rel.totalRealised >= 10) {
    cues.push({
      kind: 'no_show_rate_high',
      severity: 'warn',
      message: `No-show rate ${rel.noShowRate}% over target ${settings.noShowTargetPercent}% (last 30 days)`,
    })
  }

  // Repeat guests with allergies arriving today
  const visitsByGuest = new Map<string, number>()
  for (const r of reservations) {
    if (r.status === 'cancelled' || r.status === 'no_show') continue
    visitsByGuest.set(r.guestId, (visitsByGuest.get(r.guestId) ?? 0) + 1)
  }
  const todayGuestIds = new Set(
    reservations
      .filter((r) => r.date === date && r.status !== 'cancelled' && r.status !== 'no_show')
      .map((r) => r.guestId),
  )
  for (const guest of guests) {
    if (!todayGuestIds.has(guest.id)) continue
    if ((guest.allergies?.length ?? 0) === 0) continue
    const past = visitsByGuest.get(guest.id) ?? 0
    if (past <= 1) continue
    cues.push({
      kind: 'allergy_repeat_today',
      severity: 'warn',
      message: `Repeat guest ${guest.fullName} (${guest.allergies.join(', ')}) arriving today`,
      guestId: guest.id,
    })
  }

  return cues
}

// Convenience: build all five panels + cues for the admin dashboard
export interface DashboardData {
  today: TodayLivePanel
  upcoming7: UpcomingPanel
  upcoming30: UpcomingPanel
  guestMix: GuestMixPanel
  channel: ChannelPerformancePanel
  reliability: ReliabilityPanel
  cues: ActionCue[]
}

export function dashboardData(
  settings: Settings,
  reservations: Reservation[],
  guests: Guest[],
  today: string = todayISO(),
): DashboardData {
  const start30 = addDays(today, -30)
  return {
    today: todayLivePanel(settings, reservations, today),
    upcoming7: upcomingDaysPanel(settings, reservations, today, 7),
    upcoming30: upcomingDaysPanel(settings, reservations, today, 30),
    guestMix: guestMixPanel(reservations, guests, start30, today),
    channel: channelPerformancePanel(reservations, start30, today),
    reliability: reliabilityPanel(reservations, start30, today),
    cues: actionCues(settings, reservations, guests, today),
  }
}

// ---- helpers used by views ----

export function describeDayLabel(dateISO: string, today: string = todayISO()): string {
  const diff = daysBetween(today, dateISO)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  const d = fromISODate(dateISO)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function pastNDaysRange(n: number, endDate: string = todayISO()) {
  const start = addDays(endDate, -(n - 1))
  return { start, end: endDate, startDate: start, endDate: endDate }
}

// Helper to keep types happy when callers want an explicit range
export { toISODate }