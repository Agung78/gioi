import { describe, expect, it } from 'vitest'
import {
  addDays,
  combine,
  compareTime,
  dayOfWeek,
  daysBetween,
  fromMinutes,
  localDate,
  localTime,
  startOfLocalDay,
  startOfNextLocalDay,
  toMinutes,
  toUtc,
} from '../dates'

const zone = 'Asia/Makassar' // UTC+8, no DST

describe('toUtc / localDate / localTime round trip', () => {
  it('converts a local wall clock to UTC and back', () => {
    const utc = toUtc('2026-06-15', '10:00', zone)
    expect(utc.getUTCHours()).toBe(2) // 10:00 WITA = 02:00 UTC
    expect(localDate(utc, zone)).toBe('2026-06-15')
    expect(localTime(utc, zone)).toBe('10:00')
  })

  it('converts midnight to the previous day in UTC', () => {
    const utc = toUtc('2026-06-15', '00:00', zone)
    expect(utc.getUTCHours()).toBe(16) // previous day 16:00 UTC
    expect(localDate(utc, zone)).toBe('2026-06-15')
  })
})

describe('startOfLocalDay / startOfNextLocalDay', () => {
  it('returns the day bounds in UTC', () => {
    const start = startOfLocalDay('2026-06-15', zone)
    expect(localDate(start, zone)).toBe('2026-06-15')
    expect(localTime(start, zone)).toBe('00:00')
    const next = startOfNextLocalDay('2026-06-15', zone)
    expect(localDate(next, zone)).toBe('2026-06-16')
  })
})

describe('addDays / daysBetween', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-30', 1)).toBe('2026-01-31')
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('computes days between', () => {
    expect(daysBetween('2026-06-15', '2026-06-17')).toBe(2)
    expect(daysBetween('2026-06-17', '2026-06-15')).toBe(-2)
  })
})

describe('toMinutes / fromMinutes / combine', () => {
  it('converts minutes both ways', () => {
    expect(toMinutes('10:30')).toBe(630)
    expect(fromMinutes(630)).toBe('10:30')
  })

  it('combines date and time', () => {
    expect(combine('2026-06-15', '10:30').getHours()).toBe(10)
  })
})

describe('dayOfWeek', () => {
  it('is Monday-first', () => {
    // 2026-06-15 is a Monday
    expect(dayOfWeek('2026-06-15')).toBe('mon')
    expect(dayOfWeek('2026-06-21')).toBe('sun')
  })
})

describe('compareTime', () => {
  it('compares HH:MM strings', () => {
    expect(compareTime('10:00', '10:30')).toBe(-30)
    expect(compareTime('10:30', '10:00')).toBe(30)
  })
})
