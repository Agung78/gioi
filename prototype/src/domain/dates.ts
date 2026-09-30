// Date/time helpers — local-time strings, no external deps.
// All reservations store date as "YYYY-MM-DD" and time as "HH:MM".

import type { DayOfWeek } from './types'
import { DAYS_OF_WEEK } from './types'

export function pad2(n: number): string {
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

export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = fromISODate(aISO).getTime()
  const b = fromISODate(bISO).getTime()
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

export function isPast(dateISO: string, time: string, now: Date = new Date()): boolean {
  return combine(dateISO, time).getTime() < now.getTime()
}

export function dayOfWeek(dateISO: string): DayOfWeek {
  return DAYS_OF_WEEK[(fromISODate(dateISO).getDay() + 6) % 7]
}

export function compareTime(a: string, b: string): number {
  return toMinutes(a) - toMinutes(b)
}