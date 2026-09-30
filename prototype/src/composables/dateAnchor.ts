// The seed JSON dates are anchored to a fixed reference date (SEED_ANCHOR).
// On hydration in the browser we compute a shift so the seed's "anchor day"
// becomes the browser's local "today", preserving the past-30 / next-14
// distribution regardless of when the demo is opened.

import { addDays, todayISO } from '../domain/dates'

export const SEED_ANCHOR = '2026-09-30'

let _shift = 0
let _resolved = false

export function resolveShift(): number {
  if (_resolved) return _shift
  _resolved = true
  const today = todayISO()
  // both are YYYY-MM-DD strings
  const a = new Date(SEED_ANCHOR + 'T00:00:00').getTime()
  const b = new Date(today + 'T00:00:00').getTime()
  _shift = Math.round((b - a) / (24 * 60 * 60 * 1000))
  return _shift
}

export function shiftDate(iso: string): string {
  return addDays(iso, resolveShift())
}

export function shiftTimestamp(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return iso
  return new Date(t + resolveShift() * 86400000).toISOString()
}