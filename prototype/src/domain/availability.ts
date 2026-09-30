// Pure availability logic. No I/O, no Vue, no Pinia.
// Given settings + existing reservations + a draft, decide whether a slot is bookable.

import type { Reservation, Settings } from './types'
import { ACTIVE_STATUSES } from './types'
import {
  addDays,
  combine,
  compareTime,
  dayOfWeek,
  fromMinutes,
  todayISO,
  toMinutes,
} from './dates'

export interface SlotAvailability {
  time: string // "HH:MM"
  open: boolean
  reason?: 'closed' | 'past' | 'lead_time' | 'cutoff' | 'full'
  remaining?: number // covers left in the most-constrained area for that party size; undefined if open=false
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

/** Reserved covers per time slot per area, only statuses that block inventory. */
export function reservedCovers(
  reservations: Reservation[],
  dateISO: string,
  time: string,
  areaId?: string,
): number {
  let sum = 0
  for (const r of reservations) {
    if (r.date !== dateISO) continue
    if (r.time !== time) continue
    if (areaId && r.seatingAreaId !== areaId) continue
    if (!ACTIVE_STATUSES.includes(r.status)) continue
    sum += r.partySize
  }
  return sum
}

/** Reserved covers across all areas at a given slot. */
export function totalReservedAt(reservations: Reservation[], dateISO: string, time: string): number {
  return reservedCovers(reservations, dateISO, time)
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
    const used = reservedCovers(reservations, dateISO, time, area.id)
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

  const slotTime = combine(draft.date, draft.time)
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
      const used = reservedCovers(reservations, draft.date, draft.time, area.id)
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
    // Surface the closed hours so the UI can still render the day
    const fallback = hours ?? { open: '00:00', close: '00:00' }
    const slots = generateIntervals(fallback.open, fallback.close, settings.bookingIntervalMinutes)
    return slots.map((t) => ({ time: t, open: false, reason: 'closed' as const }))
  }

  const intervals = generateIntervals(hours.open, hours.close, settings.bookingIntervalMinutes)
  return intervals.map((time) => {
    if (compareTime(time, hours.close) === 0) {
      // Don't allow booking the closing minute itself if it equals close
      // (matches "must start service before close" — slots equal to close are excluded)
      return { time, open: false, reason: 'closed' as const }
    }
    const result = checkAvailability(settings, reservations, { date: dateISO, time, partySize }, { now })
    if (!result.ok) {
      const primary = result.reasons[0]
      const reason: SlotAvailability['reason'] =
        primary === 'closed_date' || primary === 'outside_hours' || primary === 'full'
          ? primary === 'full' ? 'full' : 'closed'
          : primary === 'past' || primary === 'lead_time' || primary === 'cutoff'
          ? 'past'
          : 'closed'
      return { time, open: false, reason }
    }
    const fit = remainingCapacityForParty(settings, reservations, dateISO, time, partySize)
    return { time, open: true, remaining: fit?.remaining }
  })
}

/** Returns the next `days` ISO date strings starting from today. */
export function nextDays(startISO: string = todayISO(), days = 14): string[] {
  return Array.from({ length: days }, (_, i) => addDays(startISO, i))
}