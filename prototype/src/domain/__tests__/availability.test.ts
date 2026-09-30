import { describe, expect, it } from 'vitest'
import {
  checkAvailability,
  generateIntervals,
  getDayAvailability,
  isClosedDate,
  isOpenOn,
  remainingCapacityForParty,
  reservedCovers,
} from '../availability'
import type { Reservation, Settings } from '../types'

const baseSettings: Settings = {
  restaurant: {
    name: 'GIOI',
    tagline: '',
    intro: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    mapsUrl: '',
    hoursSummary: '',
    heroEmoji: '',
  },
  openingHours: {
    mon: { open: '00:00', close: '00:00' },
    tue: { open: '12:00', close: '22:00' },
    wed: { open: '12:00', close: '22:00' },
    thu: { open: '12:00', close: '22:00' },
    fri: { open: '12:00', close: '23:00' },
    sat: { open: '12:00', close: '23:00' },
    sun: { open: '12:00', close: '22:00' },
  },
  closedDates: ['2026-01-01'],
  bookingIntervalMinutes: 30,
  partySizeLimits: { min: 1, max: 8 },
  leadTimeMinutes: 60,
  cutoffMinutes: 120,
  noShowTargetPercent: 5,
  overCapacityAlertPercent: 85,
  seatingAreas: [
    { id: 'main', name: 'Main Hall', capacity: 20, bookable: true },
    { id: 'terrace', name: 'Sunset Terrace', capacity: 12, bookable: true, minParty: 2 },
  ],
  cancellationPolicy: '',
}

const fixedNow = new Date('2026-06-15T10:00:00')

describe('generateIntervals', () => {
  it('emits slots from open to close inclusive of the open minute', () => {
    expect(generateIntervals('12:00', '14:00', 30)).toEqual(['12:00', '12:30', '13:00', '13:30', '14:00'])
  })
  it('respects custom step', () => {
    expect(generateIntervals('12:00', '13:00', 15)).toEqual(['12:00', '12:15', '12:30', '12:45', '13:00'])
  })
})

describe('closed dates & opening hours', () => {
  it('detects closed dates', () => {
    expect(isClosedDate(baseSettings, '2026-01-01')).toBe(true)
    expect(isClosedDate(baseSettings, '2026-02-01')).toBe(false)
  })
  it('isOpenOn respects closed dates and per-day hours', () => {
    expect(isOpenOn(baseSettings, '2026-06-15')).toBe(true) // monday — all zero hours
    // set monday to actual hours
    baseSettings.openingHours.mon = { open: '12:00', close: '22:00' }
    expect(isOpenOn(baseSettings, '2026-06-15')).toBe(true)
    expect(isOpenOn(baseSettings, '2026-01-01')).toBe(false) // closed date
  })
})

describe('reservedCovers', () => {
  const reservations: Reservation[] = [
    {
      id: 'r1', bookingCode: 'A1', guestId: 'g1', date: '2026-06-20', time: '19:00',
      partySize: 4, seatingAreaId: 'main', source: 'website', status: 'confirmed',
      createdBy: 'system', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'r2', bookingCode: 'A2', guestId: 'g2', date: '2026-06-20', time: '19:00',
      partySize: 6, seatingAreaId: 'terrace', source: 'website', status: 'arrived',
      createdBy: 'system', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'r3', bookingCode: 'A3', guestId: 'g3', date: '2026-06-20', time: '19:00',
      partySize: 2, seatingAreaId: 'main', source: 'website', status: 'cancelled',
      createdBy: 'system', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'r4', bookingCode: 'A4', guestId: 'g4', date: '2026-06-20', time: '20:00',
      partySize: 3, seatingAreaId: 'main', source: 'website', status: 'no_show',
      createdBy: 'system', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
    },
  ]

  it('only counts active statuses', () => {
    expect(reservedCovers(reservations, '2026-06-20', '19:00', 'main')).toBe(4)
    expect(reservedCovers(reservations, '2026-06-20', '19:00')).toBe(10)
    expect(reservedCovers(reservations, '2026-06-20', '20:00', 'main')).toBe(0)
  })
})

describe('checkAvailability', () => {
  const reservations: Reservation[] = []

  it('blocks a closed date', () => {
    const r = checkAvailability(baseSettings, reservations, {
      date: '2026-01-01', time: '19:00', partySize: 2,
    }, { now: fixedNow })
    expect(r.ok).toBe(false)
    expect(r.reasons).toContain('closed_date')
  })

  it('blocks times outside opening hours', () => {
    const r = checkAvailability(baseSettings, reservations, {
      date: '2026-06-20', time: '11:30', partySize: 2,
    }, { now: fixedNow })
    expect(r.reasons).toContain('outside_hours')
  })

  it('blocks too-small and too-large party sizes', () => {
    expect(checkAvailability(baseSettings, reservations, {
      date: '2026-06-20', time: '19:00', partySize: 0,
    }, { now: fixedNow }).reasons).toContain('party_too_small')

    expect(checkAvailability(baseSettings, reservations, {
      date: '2026-06-20', time: '19:00', partySize: 9,
    }, { now: fixedNow }).reasons).toContain('party_too_large')
  })

  it('blocks past slots even on an open day', () => {
    const r = checkAvailability(baseSettings, reservations, {
      date: '2026-06-15', time: '09:00', partySize: 2,
    }, { now: fixedNow })
    expect(r.reasons).toContain('past')
    expect(r.reasons).toContain('lead_time')
  })

  it('blocks slots inside the cutoff window', () => {
    // 12:00 today, now 10:00 → 2h lead, exactly cutoffMinutes
    const r = checkAvailability(baseSettings, reservations, {
      date: '2026-06-15', time: '12:00', partySize: 2,
    }, { now: fixedNow })
    expect(r.reasons).toContain('cutoff')
  })

  it('blocks a fully booked area when areaId is supplied', () => {
    const packed: Reservation[] = [
      ...reservations,
      {
        id: 'f1', bookingCode: 'F1', guestId: 'g1', date: '2026-06-20', time: '19:00',
        partySize: 12, seatingAreaId: 'terrace', source: 'website', status: 'confirmed',
        createdBy: 'system', createdAt: '', updatedAt: '',
      },
    ]
    const r = checkAvailability(baseSettings, packed, {
      date: '2026-06-20', time: '19:00', partySize: 2, seatingAreaId: 'terrace',
    }, { now: fixedNow })
    expect(r.reasons).toContain('full')
  })

  it('blocks terrace area for solo guests', () => {
    const r = checkAvailability(baseSettings, reservations, {
      date: '2026-06-20', time: '19:00', partySize: 1, seatingAreaId: 'terrace',
    }, { now: fixedNow })
    expect(r.reasons).toContain('party_too_small')
  })

  it('returns ok for a draft that fits and is in the future', () => {
    const r = checkAvailability(baseSettings, reservations, {
      date: '2026-06-20', time: '19:00', partySize: 4,
    }, { now: fixedNow })
    expect(r.ok).toBe(true)
    // 4 guests fit in either area; logic picks the tightest that fits → terrace (cap 12)
    expect(r.areaId).toBe('terrace')
  })
})

describe('remainingCapacityForParty', () => {
  it('returns null when no area can fit the party', () => {
    const r = remainingCapacityForParty(baseSettings, [], '2026-06-20', '19:00', 99)
    expect(r).toBeNull()
  })
  it('skips areas whose minParty excludes the party', () => {
    const r = remainingCapacityForParty(baseSettings, [], '2026-06-20', '19:00', 1)
    expect(r?.areaId).toBe('main')
  })
  it('returns the tightest area that still fits', () => {
    const reservations: Reservation[] = [
      {
        id: 'b1', bookingCode: 'B1', guestId: 'g1', date: '2026-06-20', time: '19:00',
        partySize: 14, seatingAreaId: 'main', source: 'website', status: 'confirmed',
        createdBy: 'system', createdAt: '', updatedAt: '',
      },
    ]
    // main: 20-14=6, terrace: 12
    const r = remainingCapacityForParty(baseSettings, reservations, '2026-06-20', '19:00', 4)
    expect(r?.areaId).toBe('main')
    expect(r?.remaining).toBe(6)
  })
})

describe('getDayAvailability', () => {
  it('marks every slot closed on a closed date', () => {
    const slots = getDayAvailability(baseSettings, [], '2026-01-01', 2, { now: fixedNow })
    expect(slots.every((s) => !s.open)).toBe(true)
    expect(slots[0].reason).toBe('closed')
  })

  it('marks past slots unavailable on today', () => {
    const later = new Date('2026-06-15T15:00:00')
    const slots = getDayAvailability(baseSettings, [], '2026-06-15', 2, { now: later })
    const past = slots.filter((s) => s.time <= '14:30')
    expect(past.length).toBeGreaterThan(0)
    expect(past.every((s) => !s.open && s.reason === 'past')).toBe(true)
    // cutoff is 120 min from now (inclusive), so slots >= 17:30 are safely open
    // (excluding the closing-time slot itself which is intentionally not bookable)
    const future = slots.filter((s) => s.time >= '17:30' && s.time < '22:00')
    expect(future.every((s) => s.open)).toBe(true)
  })

  it('marks full slots as not open', () => {
    const reservations: Reservation[] = [
      {
        id: 'f1', bookingCode: 'F1', guestId: 'g1', date: '2026-06-20', time: '19:00',
        partySize: 20, seatingAreaId: 'main', source: 'website', status: 'confirmed',
        createdBy: 'system', createdAt: '', updatedAt: '',
      },
      {
        id: 'f2', bookingCode: 'F2', guestId: 'g2', date: '2026-06-20', time: '19:00',
        partySize: 12, seatingAreaId: 'terrace', source: 'website', status: 'confirmed',
        createdBy: 'system', createdAt: '', updatedAt: '',
      },
    ]
    const slots = getDayAvailability(baseSettings, reservations, '2026-06-20', 2, { now: fixedNow })
    const full = slots.find((s) => s.time === '19:00')!
    expect(full.open).toBe(false)
    expect(full.reason).toBe('full')
  })
})