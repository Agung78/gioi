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
    name: 'GIOI Test',
    tagline: 't',
    intro: 'i',
    address: 'a',
    phone: '+62 811 3960 6101',
    whatsapp: '+62 811 3960 6101',
    email: 'test@gioigroup.com',
    mapsUrl: 'https://maps.google.com/',
  },
  timeZone: 'Asia/Makassar',
  openingHours: {
    mon: { open: '10:00', close: '22:00' },
    tue: { open: '10:00', close: '22:00' },
    wed: { open: '10:00', close: '22:00' },
    thu: { open: '10:00', close: '22:00' },
    fri: { open: '10:00', close: '22:00' },
    sat: { open: '10:00', close: '22:00' },
    sun: { open: '10:00', close: '22:00' },
  },
  closedDates: ['2026-01-01'],
  bookingIntervalMinutes: 30,
  partySizeLimits: { min: 1, max: 8 },
  leadTimeMinutes: 60,
  cutoffMinutes: 120,
  noShowTargetPercent: 5,
  overCapacityAlertPercent: 85,
  seatingAreas: [
    { id: 'main', name: 'Main Hall', capacity: 24, bookable: true },
    { id: 'terrace', name: 'Sunset Terrace', capacity: 14, bookable: true, minParty: 2 },
    { id: 'counter', name: "Chef's Counter", capacity: 6, bookable: true, maxParty: 4 },
    { id: 'beachfront', name: 'Beachfront Lounge', capacity: 16, bookable: true, minParty: 2 },
  ],
  cancellationPolicy: '',
  feedbackMessageTemplate: '',
}

const fixedNow = new Date('2026-06-15T02:00:00Z') // 10:00 WITA

const res = (over: Partial<Reservation>): Reservation => ({
  id: 'r1',
  bookingCode: 'GIOI-ABCD',
  guestId: 'g1',
  date: '2026-06-15',
  time: '12:00',
  partySize: 2,
  seatingAreaId: 'main',
  source: 'website',
  status: 'confirmed',
  createdBy: 'guest',
  createdAt: '2026-06-14T10:00:00Z',
  updatedAt: '2026-06-14T10:00:00Z',
  ...over,
})

describe('generateIntervals', () => {
  it('emits slots from open to close inclusive', () => {
    expect(generateIntervals('12:00', '14:00', 30)).toEqual([
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
    ])
  })
  it('respects custom step', () => {
    expect(generateIntervals('12:00', '13:00', 15)).toEqual([
      '12:00',
      '12:15',
      '12:30',
      '12:45',
      '13:00',
    ])
  })
})

describe('closed dates & opening hours', () => {
  it('flags closed dates', () => {
    expect(isClosedDate(baseSettings, '2026-01-01')).toBe(true)
    expect(isClosedDate(baseSettings, '2026-06-15')).toBe(false)
  })

  it('reports open days', () => {
    expect(isOpenOn(baseSettings, '2026-06-15')).toBe(true)
    expect(isOpenOn(baseSettings, '2026-01-01')).toBe(false)
  })
})

describe('reservedCovers', () => {
  it('sums active covers at the exact slot and area', () => {
    const rs = [
      res({ partySize: 2, seatingAreaId: 'main', status: 'confirmed' }),
      res({ partySize: 3, seatingAreaId: 'main', status: 'arrived' }),
      res({ partySize: 4, seatingAreaId: 'main', status: 'completed' }),
      res({ partySize: 5, seatingAreaId: 'terrace', status: 'confirmed' }),
    ]
    expect(reservedCovers(rs, '2026-06-15', '12:00', 'main')).toBe(5)
    expect(reservedCovers(rs, '2026-06-15', '12:00')).toBe(10)
    expect(reservedCovers(rs, '2026-06-15', '12:00', 'terrace')).toBe(5)
  })

  it('ignores inactive statuses', () => {
    const rs = [res({ status: 'cancelled' }), res({ status: 'no_show' })]
    expect(reservedCovers(rs, '2026-06-15', '12:00')).toBe(0)
  })

  it('overlap rule: diningMinutes counts adjacent-slot reservations', () => {
    const settings = { ...baseSettings, diningMinutes: 120 }
    const rs = [res({ partySize: 10, seatingAreaId: 'main', status: 'confirmed', time: '12:00' })]
    expect(reservedCovers(rs, '2026-06-15', '13:00', 'main', settings.diningMinutes)).toBe(10)
    expect(reservedCovers(rs, '2026-06-15', '12:00', 'main', settings.diningMinutes)).toBe(10)
    expect(reservedCovers(rs, '2026-06-15', '14:00', 'main', settings.diningMinutes)).toBe(0)
    const fit = remainingCapacityForParty(settings, rs, '2026-06-15', '13:00', 17)
    expect(fit).toBeNull()
  })
})

describe('checkAvailability', () => {
  const draft = { date: '2026-06-15', time: '13:00', partySize: 2 }

  it('approves an open slot', () => {
    expect(checkAvailability(baseSettings, [], draft, { now: fixedNow }).ok).toBe(true)
  })

  it('flags a closed date', () => {
    const r = checkAvailability(
      baseSettings,
      [],
      { ...draft, date: '2026-01-01' },
      { now: fixedNow },
    )
    expect(r.ok).toBe(false)
    expect(r.reasons).toContain('closed_date')
  })

  it('flags outside hours', () => {
    const r = checkAvailability(
      baseSettings,
      [],
      { ...draft, time: '09:00' },
      { now: fixedNow },
    )
    expect(r.ok).toBe(false)
    expect(r.reasons).toContain('outside_hours')
  })

  it('flags party too small / large', () => {
    const small = checkAvailability(
      baseSettings,
      [],
      { ...draft, partySize: 0 },
      { now: fixedNow },
    )
    expect(small.reasons).toContain('party_too_small')
    const large = checkAvailability(
      baseSettings,
      [],
      { ...draft, partySize: 9 },
      { now: fixedNow },
    )
    expect(large.reasons).toContain('party_too_large')
  })

  it('flags lead time', () => {
    const r = checkAvailability(
      baseSettings,
      [],
      { ...draft, date: '2026-06-15', time: '10:30' },
      { now: fixedNow },
    )
    expect(r.reasons).toContain('lead_time')
  })

  it('skips temporal checks when requested', () => {
    const r = checkAvailability(
      baseSettings,
      [],
      { ...draft, date: '2026-06-15', time: '10:30' },
      { now: fixedNow, skipTemporal: true },
    )
    expect(r.ok).toBe(true)
  })

  it('flags full when area capacity is exceeded', () => {
    const rs = [res({ partySize: 24, seatingAreaId: 'main', status: 'confirmed' })]
    const r = checkAvailability(
      baseSettings,
      rs,
      { ...draft, date: '2026-06-15', time: '12:00', partySize: 1, seatingAreaId: 'main' },
      { now: fixedNow },
    )
    expect(r.ok).toBe(false)
    expect(r.reasons).toContain('full')
  })

  it('picks best-fit area when none specified', () => {
    const r = checkAvailability(
      baseSettings,
      [],
      { ...draft, partySize: 2 },
      { now: fixedNow },
    )
    expect(r.ok).toBe(true)
    expect(r.areaId).toBeDefined()
  })
})

describe('remainingCapacityForParty', () => {
  it('picks the smallest remaining capacity that fits', () => {
    const rs = [res({ partySize: 20, seatingAreaId: 'main', status: 'confirmed' })]
    const fit = remainingCapacityForParty(
      baseSettings,
      rs,
      '2026-06-15',
      '12:00',
      2,
    )
    expect(fit?.areaId).toBe('main')
    expect(fit?.remaining).toBe(4)
  })

  it('returns null when no area fits', () => {
    const rs = [
      res({ partySize: 24, seatingAreaId: 'main', status: 'confirmed' }),
      res({ partySize: 14, seatingAreaId: 'terrace', status: 'confirmed' }),
      res({ partySize: 6, seatingAreaId: 'counter', status: 'confirmed' }),
      res({ partySize: 16, seatingAreaId: 'beachfront', status: 'confirmed' }),
    ]
    expect(
      remainingCapacityForParty(baseSettings, rs, '2026-06-15', '12:00', 1),
    ).toBeNull()
  })
})

describe('getDayAvailability', () => {
  it('returns open slots with remaining counts', () => {
    const slots = getDayAvailability(baseSettings, [], '2026-06-15', 2, {
      now: fixedNow,
    })
    const firstOpen = slots.find((s) => s.open)
    expect(firstOpen).toBeDefined()
    expect(firstOpen?.remaining).toBeGreaterThanOrEqual(2)
  })

  it('marks the closing slot as closed', () => {
    const slots = getDayAvailability(baseSettings, [], '2026-06-15', 2, {
      now: fixedNow,
    })
    const last = slots[slots.length - 1]
    expect(last.open).toBe(false)
  })

  it('marks a full day closed', () => {
    const slots = getDayAvailability(baseSettings, [], '2026-01-01', 2, {
      now: fixedNow,
    })
    expect(slots.every((s) => !s.open)).toBe(true)
  })
})
