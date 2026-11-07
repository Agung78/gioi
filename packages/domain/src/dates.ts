// Date/time helpers using the venue's IANA time zone.
// All stored timestamps are UTC timestamptz; slots, opening hours and "today"
// are computed in the venue's local zone via Intl.

import type { DayOfWeek } from './types'

const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function toISODate(d: Date): string {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function fromISODate(iso: string): Date {
	const [y, m, day] = iso.split('-').map(Number)
	return new Date(y, m - 1, day)
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

/** Offset (in minutes) of `timeZone` ahead of UTC at `instantMs`. Positive = east of Greenwich. */
function zoneOffsetMinutes(timeZone: string, instantMs: number): number {
  const df = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = df.formatToParts(new Date(instantMs))
  const get = (name: string): number =>
    Number(parts.find((p) => p.type === name)?.value ?? 0)
  const localAsUtcMs = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return (localAsUtcMs - instantMs) / 60000
}

/** Convert a local date + HH:MM in the venue zone to a UTC Date. */
export function toUtc(dateISO: string, timeHHMM: string, timeZone: string): Date {
  const [y, mo, d] = dateISO.split('-').map(Number)
  const [h, mi] = timeHHMM.split(':').map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0)
  const offset = zoneOffsetMinutes(timeZone, guess)
  return new Date(guess - offset * 60000)
}

/** Convert a UTC Date to the local "YYYY-MM-DD" date in the venue zone. */
export function localDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\//g, '-')
}

/** Convert a UTC Date to the local "HH:MM" time in the venue zone. */
export function localTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\u202f/g, '')
}

/** Start of the local day in the venue zone, as a UTC Date. */
export function startOfLocalDay(dateISO: string, timeZone: string): Date {
  return toUtc(dateISO, '00:00', timeZone)
}

/** Start of the next local day in the venue zone, as a UTC Date. */
export function startOfNextLocalDay(dateISO: string, timeZone: string): Date {
  const next = addDays(dateISO, 1)
  return toUtc(next, '00:00', timeZone)
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  return `${y}-${pad2(mo)}-${pad2(day)}`
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T12:00:00Z`).getTime()
  const b = new Date(`${bISO}T12:00:00Z`).getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${pad2(h)}:${pad2(m)}`
}

export function combine(dateISO: string, time: string): Date {
  const [y, mo, d] = dateISO.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi, 0, 0)
}

export function dayOfWeek(dateISO: string): DayOfWeek {
  const d = new Date(`${dateISO}T12:00:00Z`)
  return DAYS_OF_WEEK[(d.getUTCDay() + 6) % 7]
}

export function compareTime(a: string, b: string): number {
  return toMinutes(a) - toMinutes(b)
}
