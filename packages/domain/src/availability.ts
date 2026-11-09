// Pure availability logic. No I/O, no Vue, no Pinia.
// Given settings + existing reservations + a draft, decide whether a slot is bookable.

import type { Reservation, Settings } from './types'
import { ACTIVE_STATUSES } from './types'
import {
  addDays,
  compareTime,
  dayOfWeek,
  fromMinutes,
  todayISO,
  toMinutes,
  toUtc,
} from './dates'

export interface SlotAvailability {
  time: string // "HH:MM"
  open: boolean
  reason?: 'closed' | 'past' | 'full'
  remaining?: number // covers left in the most-constrained area for that party size
}

export function generateIntervals(open: string, close: string, stepMinutes: number): string[] {
  const slots: string[] = []
  const start = toMinutes(open)
  const end = toMinutes(close)
  for (let m = start; m <= end; m += stepMinutes) {
    slots.push(fromMinutes(m))
  }
  return slots
}

export function isClosedDate(settings: Settings, dateISO: string): boolean {
  return settings.closedDates.includes(dateISO)
}

export function isOpenOn(settings: Settings, dateISO: string): boolean {
  if (isClosedDate(settings, dateISO)) return false
  const hours = settings.openingHours[dayOfWeek(dateISO)]
  return !!(hours?.open && hours?.close)
}

export function hoursFor(settings: Settings, dateISO: string) {
  const hours = settings.openingHours[dayOfWeek(dateISO)]
  return hours ?? null
}

/** Reserved covers per time slot per area, counting reservations whose table time overlaps the slot.
 *
 * Overlap rule (§3.3 gap): a party seated at 19:00 holds its seats for `diningMinutes`,
 * so any slot whose [starts, starts + diningMinutes) window intersects an existing
 * reservation's window counts against that area's capacity. When `diningMinutes` is
 * 0 or unset this degenerates to exact-slot matching (the legacy prototype rule).
 */
export function reservedCovers(
  reservations: Reservation[],
  dateISO: string,
  time: string,
  areaId?: string,
  diningMinutes = 0,
): number {
  const slotStart = toMinutes(time)
  const exact = diningMinutes <= 0
  let sum = 0
  for (const r of reservations) {
    if (r.date !== dateISO) continue
    if (areaId && r.seatingAreaId !== areaId) continue
    if (!ACTIVE_STATUSES.includes(r.status)) continue
    const resStart = toMinutes(r.time)
    if (exact) {
      if (resStart !== slotStart) continue
    } else {
      const resEnd = resStart + diningMinutes
      const slotEnd = slotStart + diningMinutes
      // Intervals [slotStart, slotEnd) and [resStart, resEnd) overlap iff slotStart < resEnd && resStart < slotEnd.
      if (!(slotStart < resEnd && resStart < slotEnd)) continue
    }
    sum += r.partySize
  }
  return sum
}

/** Find the smallest remaining capacity among bookable areas that can fit the party size. */
export function remainingCapacityForParty(
  settings: Settings,
  reservations: Reservation[],
  dateISO: string,
  time: string,
  partySize: number,
): { areaId: string; remaining: number } | null {
  const areas = settings.seatingAreas.filter((a) => {
    if (!a.bookable) return false
    if (a.minParty && partySize < a.minParty) return false
    if (a.maxParty && partySize > a.maxParty) return false
    return true
  })
  if (areas.length === 0) return null
  let best: { areaId: string; remaining: number } | null = null
  for (const area of areas) {
    const used = reservedCovers(reservations, dateISO, time, area.id, settings.diningMinutes)
    const remaining = area.capacity - used
    if (remaining < partySize) continue
    if (!best || remaining < best.remaining) {
      best = { areaId: area.id, remaining }
    }
  }
  return best
}

export interface CheckOptions {
  now?: Date
  /** Skip past/lead-time/cutoff checks (used by walk-ins where the guest is already here). */
  skipTemporal?: boolean
  /** When set, report availability for this area only instead of picking the best-fit area. */
  seatingAreaId?: string
}

/** Reasons a draft is not bookable. Returned as an array so we can show all blockers at once. */
export type UnavailableReason =
  | 'closed_date'
  | 'outside_hours'
  | 'past'
  | 'lead_time'
  | 'cutoff'
  | 'party_too_small'
  | 'party_too_large'
  | 'no_area'
  | 'full'

export interface AvailabilityResult {
  ok: boolean
  reasons: UnavailableReason[]
  areaId?: string
}

/** Check whether a draft reservation can be confirmed. */
export function checkAvailability(
  settings: Settings,
  reservations: Reservation[],
  draft: { date: string; time: string; partySize: number; seatingAreaId?: string },
  opts: CheckOptions = {},
): AvailabilityResult {
  const now = opts.now ?? new Date()
  const reasons: UnavailableReason[] = []

  if (!isOpenOn(settings, draft.date)) reasons.push('closed_date')

  const hours = hoursFor(settings, draft.date)
  if (hours) {
    const mins = toMinutes(draft.time)
    if (mins < toMinutes(hours.open) || mins > toMinutes(hours.close)) {
      reasons.push('outside_hours')
    }
  }

  if (draft.partySize < settings.partySizeLimits.min) reasons.push('party_too_small')
  if (draft.partySize > settings.partySizeLimits.max) reasons.push('party_too_large')

  const slotTime = toUtc(draft.date, draft.time, settings.timeZone)
  const nowMs = now.getTime()
  const diffMin = (slotTime.getTime() - nowMs) / 60000
  if (!opts.skipTemporal) {
    if (diffMin < settings.leadTimeMinutes) reasons.push('lead_time')
    if (diffMin <= settings.cutoffMinutes) reasons.push('cutoff')
    if (slotTime.getTime() < nowMs) reasons.push('past')
  }

  // Capacity check
  let areaId: string | undefined
  if (draft.seatingAreaId) {
    const area = settings.seatingAreas.find((a) => a.id === draft.seatingAreaId)
    if (!area || !area.bookable) {
      reasons.push('no_area')
    } else {
      if (area.minParty && draft.partySize < area.minParty) reasons.push('party_too_small')
      if (area.maxParty && draft.partySize > area.maxParty) reasons.push('party_too_large')
      const used = reservedCovers(reservations, draft.date, draft.time, area.id, settings.diningMinutes)
      if (used + draft.partySize > area.capacity) reasons.push('full')
      areaId = area.id
    }
  } else {
    const fit = remainingCapacityForParty(
      settings,
      reservations,
      draft.date,
      draft.time,
      draft.partySize,
    )
    if (!fit) {
      const anyBookable = settings.seatingAreas.some((a) => a.bookable)
      reasons.push(anyBookable ? 'full' : 'no_area')
    } else {
      areaId = fit.areaId
    }
  }

  return { ok: reasons.length === 0, reasons: Array.from(new Set(reasons)), areaId }
}

/** Compute availability for every bookable slot in a given day, for a given party size. */
export function getDayAvailability(
  settings: Settings,
  reservations: Reservation[],
  dateISO: string,
  partySize: number,
  opts: CheckOptions = {},
): SlotAvailability[] {
  const now = opts.now ?? new Date()
  const hours = hoursFor(settings, dateISO)
  if (!hours || !isOpenOn(settings, dateISO)) {
    const fallback = hours ?? { open: '00:00', close: '00:00' }
    const slots = generateIntervals(fallback.open, fallback.close, settings.bookingIntervalMinutes)
    return slots.map((t) => ({ time: t, open: false, reason: 'closed' as const }))
  }

  const intervals = generateIntervals(hours.open, hours.close, settings.bookingIntervalMinutes)
  return intervals.map((time) => {
    // Don't allow booking the closing slot itself (must start service before close)
    if (compareTime(time, hours.close) === 0) {
      return { time, open: false, reason: 'closed' as const }
    }
    const result = checkAvailability(settings, reservations, { date: dateISO, time, partySize, seatingAreaId: opts.seatingAreaId }, { now })
    if (!result.ok) {
      const primary = result.reasons[0]
      const reason: SlotAvailability['reason'] =
        primary === 'closed_date' || primary === 'outside_hours'
          ? 'closed'
          : primary === 'full'
          ? 'full'
          : 'past'
      return { time, open: false, reason }
    }
    // Scoped to one area: remaining covers there; otherwise the best-fit area across the venue.
    const area = opts.seatingAreaId ? settings.seatingAreas.find((a) => a.id === opts.seatingAreaId) : undefined
    const remaining = area
      ? area.capacity - reservedCovers(reservations, dateISO, time, area.id, settings.diningMinutes)
      : remainingCapacityForParty(settings, reservations, dateISO, time, partySize)?.remaining
    return { time, open: true, remaining }
  })
}

/** Returns the next `days` ISO date strings starting from today. */
export function nextDays(startISO: string = todayISO(), days = 14): string[] {
  return Array.from({ length: days }, (_, i) => addDays(startISO, i))
}
