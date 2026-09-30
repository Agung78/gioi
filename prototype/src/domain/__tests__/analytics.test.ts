import { describe, expect, it } from 'vitest'
import {
  actionCues,
  channelPerformancePanel,
  dashboardData,
  guestMixPanel,
  reliabilityPanel,
  todayLivePanel,
  upcomingDaysPanel,
} from '../analytics'
import type { Guest, Reservation, Settings } from '../types'

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
    mon: { open: '12:00', close: '22:00' },
    tue: { open: '12:00', close: '22:00' },
    wed: { open: '12:00', close: '22:00' },
    thu: { open: '12:00', close: '22:00' },
    fri: { open: '12:00', close: '22:00' },
    sat: { open: '12:00', close: '22:00' },
    sun: { open: '12:00', close: '22:00' },
  },
  closedDates: [],
  bookingIntervalMinutes: 30,
  partySizeLimits: { min: 1, max: 8 },
  leadTimeMinutes: 60,
  cutoffMinutes: 120,
  noShowTargetPercent: 5,
  overCapacityAlertPercent: 85,
  seatingAreas: [
    { id: 'main', name: 'Main Hall', capacity: 20, bookable: true },
    { id: 'terrace', name: 'Terrace', capacity: 10, bookable: true, minParty: 2 },
  ],
  cancellationPolicy: '',
}

const baseReservation = (over: Partial<Reservation>): Reservation => ({
  id: 'r', bookingCode: 'A', guestId: 'g', date: '2026-06-15', time: '19:00',
  partySize: 2, seatingAreaId: 'main', source: 'website', status: 'confirmed',
  createdBy: 'system', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
  ...over,
})

const makeReservations = (): Reservation[] => [
  baseReservation({ id: '1', date: '2026-06-15', time: '19:00', partySize: 4, status: 'completed', guestId: 'g1' }),
  baseReservation({ id: '2', date: '2026-06-15', time: '20:00', partySize: 2, status: 'confirmed', guestId: 'g2' }),
  baseReservation({ id: '3', date: '2026-06-15', time: '19:30', partySize: 6, status: 'arrived', guestId: 'g3' }),
  baseReservation({ id: '4', date: '2026-06-15', time: '18:30', partySize: 3, status: 'cancelled', guestId: 'g4' }),
  baseReservation({ id: '5', date: '2026-06-16', time: '19:00', partySize: 5, status: 'completed', guestId: 'g1' }),
  baseReservation({ id: '6', date: '2026-06-17', time: '19:00', partySize: 2, status: 'no_show', guestId: 'g5' }),
  baseReservation({ id: '7', date: '2026-06-18', time: '19:00', partySize: 8, status: 'confirmed', source: 'instagram', guestId: 'g6' }),
]

const makeGuests = (): Guest[] => [
  { id: 'g1', fullName: 'Alice', phone: '+62811000001', allergies: [], marketingConsent: false, createdAt: '', updatedAt: '' },
  { id: 'g2', fullName: 'Bob', phone: '+62811000002', allergies: ['peanut'], marketingConsent: true, createdAt: '', updatedAt: '' },
  { id: 'g3', fullName: 'Cara', phone: '+62811000003', allergies: [], marketingConsent: false, createdAt: '', updatedAt: '' },
  { id: 'g4', fullName: 'Dewi', phone: '+62811000004', allergies: [], marketingConsent: false, createdAt: '', updatedAt: '' },
  { id: 'g5', fullName: 'Eka', phone: '+62811000005', allergies: [], marketingConsent: false, createdAt: '', updatedAt: '' },
  { id: 'g6', fullName: 'Fajar', phone: '+62811000006', allergies: [], marketingConsent: false, createdAt: '', updatedAt: '' },
]

describe('todayLivePanel', () => {
  it('counts covers by status for the given day', () => {
    const panel = todayLivePanel(baseSettings, makeReservations(), '2026-06-15')
    expect(panel.bookings).toBe(4)
    expect(panel.expectedCovers).toBe(12) // 4 + 2 + 6
    expect(panel.arrivedCovers).toBe(10) // 4 + 6
    expect(panel.seatedCovers).toBe(4) // completed only counts as seated/completed covers
    expect(panel.completedCovers).toBe(4)
    expect(panel.cancellations).toBe(1)
    expect(panel.noShows).toBe(0)
  })
})

describe('upcomingDaysPanel', () => {
  it('builds a per-day breakdown sorted by date', () => {
    const panel = upcomingDaysPanel(baseSettings, makeReservations(), '2026-06-15', 7)
    expect(panel.daysBreakdown.length).toBe(7)
    const day1 = panel.daysBreakdown[0]
    expect(day1.date).toBe('2026-06-15')
    expect(day1.covers).toBe(12)
    expect(panel.busiestSlot?.time).toBeTruthy()
    // 12 + 5 + 8 (no_show and cancelled are excluded from upcoming covers)
    expect(panel.totalCovers).toBe(25)
  })
})

describe('guestMixPanel', () => {
  it('classifies first-timers vs repeat guests and counts occasions', () => {
    const panel = guestMixPanel(makeReservations(), makeGuests(), '2026-06-01', '2026-06-30')
    // g1 visited twice (id 1 + id 5) — repeat
    // g3 visited once — first timer
    expect(panel.firstTimers + panel.repeatGuests).toBeGreaterThan(0)
    expect(panel.repeatGuests).toBeGreaterThanOrEqual(1)
    expect(panel.partySizeMix.length).toBeGreaterThan(0)
  })
})

describe('channelPerformancePanel', () => {
  it('breaks down bookings by source and computes share', () => {
    const panel = channelPerformancePanel(makeReservations())
    const ig = panel.rows.find((r) => r.channel === 'instagram')
    expect(ig?.bookings).toBe(1)
    const totalShare = panel.rows.reduce((s, r) => s + r.share, 0)
    // share is rounded, so allow ±rowCount slack
    expect(Math.abs(totalShare - 100)).toBeLessThanOrEqual(panel.rows.length)
  })
})

describe('reliabilityPanel', () => {
  it('computes no-show and cancellation rates', () => {
    const panel = reliabilityPanel(makeReservations())
    expect(panel.noShows).toBe(1)
    expect(panel.cancellations).toBe(1)
    expect(panel.totalRealised).toBe(7)
    expect(panel.noShowRate).toBe(Math.round((1 / 7) * 100))
  })
})

describe('actionCues', () => {
  it('flags slots above the over-capacity threshold', () => {
    const reservations = [
      baseReservation({ date: '2026-06-15', time: '19:00', partySize: 18, status: 'confirmed' }),
    ]
    const cues = actionCues(baseSettings, reservations, makeGuests(), '2026-06-15')
    expect(cues.some((c) => c.kind === 'slot_over_capacity')).toBe(true)
  })

  it('flags no-show rate above target', () => {
    const reservations: Reservation[] = []
    // 20 reservations over the last 30 days, every 5th is a no-show
    for (let i = 0; i < 20; i++) {
      const day = i + 1
      const date = `2026-05-${String(20 + day).padStart(2, '0')}`
      reservations.push(baseReservation({
        id: `r${i}`,
        date,
        status: i % 5 === 0 ? 'no_show' : 'completed',
      }))
    }
    const cues = actionCues(baseSettings, reservations, makeGuests(), '2026-06-15')
    expect(cues.some((c) => c.kind === 'no_show_rate_high')).toBe(true)
  })

  it('flags repeat guests with allergies arriving today', () => {
    const reservations: Reservation[] = [
      baseReservation({ id: 'past', date: '2026-06-10', time: '19:00', partySize: 2, status: 'completed', guestId: 'g2' }),
      baseReservation({ id: 'today', date: '2026-06-15', time: '19:00', partySize: 2, status: 'confirmed', guestId: 'g2' }),
    ]
    const cues = actionCues(baseSettings, reservations, makeGuests(), '2026-06-15')
    expect(cues.some((c) => c.kind === 'allergy_repeat_today')).toBe(true)
  })
})

describe('dashboardData', () => {
  it('returns every panel and cues for a given day', () => {
    const data = dashboardData(baseSettings, makeReservations(), makeGuests(), '2026-06-15')
    expect(data.today.date).toBe('2026-06-15')
    expect(data.upcoming7.daysBreakdown.length).toBe(7)
    expect(data.upcoming30.daysBreakdown.length).toBe(30)
    expect(data.channel.rows.length).toBeGreaterThan(0)
    // reliability range is the last 30 days ending today (inclusive), so only same-day
    // reservations count. today = 2026-06-15 → 4 reservations on that date.
    expect(data.reliability.totalRealised).toBe(4)
    expect(Array.isArray(data.cues)).toBe(true)
  })
})