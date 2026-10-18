#!/usr/bin/env node
// Generates src/mock/*.json for the prototype.
// Deterministic — same output every run because it uses mulberry32 PRNG.
// Anchors "today" to a fixed reference date so reservations stay distributed
// realistically and the Pinia store shifts dates onto the browser's local clock.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../src/mock')
mkdirSync(outDir, { recursive: true })

// Deterministic PRNG (mulberry32)
function rng(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20261018)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const range = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))

// ---- Settings / restaurant info ----
const settings = {
  restaurant: {
    name: 'GIOI Ocean Gourmet',
    tagline: 'Coastal dining, modern Asian flavours, Kuta sunsets.',
    intro:
      'A beachfront restaurant at Discovery Mall Bali, serving seafood, sharing plates and modern Asian flavours with Kuta Beach in view.',
    address: 'Ground Floor Beach Front, Discovery Mall Bali, Jl. Kartika Plaza, Kuta, Badung, Bali 80361, Indonesia',
    phone: '+62 811 3960 6101',
    whatsapp: '+62 811 3960 6101',
    email: 'ocean.kuta@gioigroup.com',
    mapsUrl: 'https://maps.google.com/?q=GIOI+Ocean+Gourmet+Kuta',
    hoursSummary: 'Daily 10:00 to 22:00 WITA',
    heroEmoji: '',
  },
  openingHours: {
    mon: { open: '10:00', close: '22:00' },
    tue: { open: '10:00', close: '22:00' },
    wed: { open: '10:00', close: '22:00' },
    thu: { open: '10:00', close: '22:00' },
    fri: { open: '10:00', close: '22:00' },
    sat: { open: '10:00', close: '22:00' },
    sun: { open: '10:00', close: '22:00' },
  },
  closedDates: ['2026-12-25', '2026-01-01'],
  bookingIntervalMinutes: 30,
  partySizeLimits: { min: 1, max: 8 },
  leadTimeMinutes: 60,
  cutoffMinutes: 120,
  noShowTargetPercent: 8,
  overCapacityAlertPercent: 85,
  seatingAreas: [
    { id: 'main', name: 'Main Hall', capacity: 24, bookable: true },
    { id: 'terrace', name: 'Sunset Terrace', capacity: 14, bookable: true, minParty: 2 },
    { id: 'counter', name: "Chef's Counter", capacity: 6, bookable: true, maxParty: 4 },
    { id: 'beachfront', name: 'Beachfront Lounge', capacity: 16, bookable: true, minParty: 2 },
  ],
  cancellationPolicy:
    'Please cancel or reschedule at least 4 hours before your booking. Late cancellations and no-shows may be charged a 200,000 IDR per-person fee.',
  feedbackTitle: 'How was your ocean dining experience?',
  feedbackSubtitle: 'Your thoughts help our kitchen and floor team make every Bali sunset visit memorable.',
  feedbackTags: [
    'Seafood freshness',
    'Sunset view',
    'Attentive service',
    'Cocktails & wine',
    'Atmosphere',
    'Pacing & timing',
    'Allergy care',
    'Value',
  ],
  feedbackMessageTemplate:
    "Hi {{guestName}}, thank you for dining with us at {{restaurantName}}. We'd love to hear about your experience: {{feedbackUrl}}",
}

// ---- Users ----
const users = [
  {
    id: 'u-admin',
    name: 'Yodha Kautsar',
    login: 'yodha',
    role: 'SUPER_ADMIN',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u-host',
    name: 'Putu Sari',
    login: 'putu',
    role: 'HOST',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u-manager',
    name: 'Made Wirawan',
    login: 'made',
    role: 'SUPER_ADMIN',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

// ---- Guests (45) ----
const GUEST_DATA = [
  { name: 'Cokorda Kusuma', country: 'Indonesia', allergies: [], access: null, pref: 'Sunset Terrace', notes: 'Prefers outdoor terrace for dinner; regular local VIP.' },
  { name: 'Tjok Sanjaya', country: 'Australia', allergies: ['Dairy-free'], access: null, pref: 'Counter seat', notes: 'Birthday in March — send a small dessert.' },
  { name: 'Gst Mahendra', country: 'Indonesia', allergies: ['Shellfish allergy'], access: null, pref: null, notes: 'Severe shellfish allergy — always alert the kitchen.' },
  { name: 'Ketut Sukma', country: 'Singapore', allergies: [], access: 'Wheelchair access — ground floor ramp', pref: 'Main Hall', notes: 'Needs wheelchair accessible table with wide clearance.' },
  { name: 'Mega Putri', country: 'Indonesia', allergies: ['Gluten-free'], access: null, pref: 'Window seat', notes: 'Loves the seafood platter and dry white wine.' },
  { name: 'Citra Sari', country: 'Australia', allergies: [], access: null, pref: 'Sunset view', notes: 'Visiting Bali annually; usually brings family of 4.' },
  { name: 'Kadek Pranata', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Jati Wijaya', country: 'Indonesia', allergies: ['Dairy-free'], access: null, pref: 'Counter seat', notes: 'Food enthusiast — likes to watch open hearth cooking.' },
  { name: 'Fajar Sari', country: 'Singapore', allergies: [], access: null, pref: null, notes: null },
  { name: 'Rai Antara', country: 'Indonesia', allergies: ['Vegetarian'], access: null, pref: 'Quiet corner', notes: 'Business dining regular — discreet service preferred.' },
  { name: 'Dewi Cahyani', country: 'Indonesia', allergies: [], access: null, pref: 'Beachfront front-row', notes: 'Celebrates anniversaries here every October.' },
  { name: 'Wayan Nugraha', country: 'Australia', allergies: ['Nut allergy'], access: null, pref: null, notes: 'Peanut and tree-nut allergy.' },
  { name: 'Bagus Sanjaya', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Komang Sanjaya', country: 'Indonesia', allergies: [], access: null, pref: 'Family section', notes: 'Often dines with small children.' },
  { name: 'Luh Permata', country: 'UK', allergies: ['Gluten-free', 'Dairy-free'], access: null, pref: 'Sunset view', notes: 'Health-conscious traveler; requested olive oil dressing.' },
  { name: 'Nyoman Wirawan', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Anak Dewi', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Aria Handayani', country: 'Indonesia', allergies: ['Vegan'], access: null, pref: 'Terrace', notes: 'Strict vegan — appreciative of plant-based options.' },
  { name: 'Darma Pratama', country: 'Japan', allergies: [], access: null, pref: "Chef's Counter", notes: 'Japanese guest; fond of fresh tuna and grilled snapper.' },
  { name: 'Gangga Anggraini', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Indah Gunawan', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Karsa Saputra', country: 'Australia', allergies: ['Shellfish allergy'], access: null, pref: null, notes: null },
  { name: 'Lestari Sukma', country: 'France', allergies: [], access: null, pref: 'Sunset view', notes: 'Sommelier guest; pre-stock organic French & Australian wines.' },
  { name: 'Nara Antara', country: 'Germany', allergies: [], access: null, pref: null, notes: null },
  { name: 'Oka Lestari', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Ratna Putri', country: 'Indonesia', allergies: [], access: 'Elderly mobility — easily accessible table', pref: 'Main Hall', notes: 'Dines with elderly grandmother.' },
  { name: 'Yanti Cahyani', country: 'Singapore', allergies: ['Halal'], access: null, pref: null, notes: 'Requests halal certified ingredients.' },
  { name: 'Adi Wijaya', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Ayu Sari', country: 'Indonesia', allergies: [], access: null, pref: 'Sunset Terrace', notes: 'Popular social media creator in Jakarta.' },
  { name: 'Bayu Pratama', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Eka Wirawan', country: 'Australia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Gede Mahendra', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Hadi Sanjaya', country: 'USA', allergies: [], access: null, pref: 'Beachfront front-row', notes: 'Visiting on honeymoon.' },
  { name: 'Indra Dewi', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Made Kusuma', country: 'Indonesia', allergies: ['Peanut allergy'], access: null, pref: null, notes: 'Peanut allergy.' },
  { name: 'Ni Permata', country: 'Indonesia', allergies: [], access: null, pref: null, notes: null },
  { name: 'Sang Handayani', country: 'Netherlands', allergies: [], access: null, pref: 'Quiet corner', notes: null },
  { name: 'Sarah Jenkins', country: 'Australia', allergies: ['Gluten-free'], access: null, pref: 'Sunset Terrace', notes: 'Returning guest from Perth — always books sunset slot.' },
  { name: 'Marcus Miller', country: 'UK', allergies: [], access: null, pref: "Chef's Counter", notes: 'Cocktail pairing enthusiast.' },
  { name: 'Chloe Dupont', country: 'France', allergies: ['Shellfish allergy'], access: null, pref: 'Sunset view', notes: 'Loves Balinese grilled fish but allergic to shrimp/crab.' },
  { name: 'Kenji Tanaka', country: 'Japan', allergies: [], access: null, pref: null, notes: 'Frequent business traveler staying at Discovery Kartika Plaza.' },
  { name: 'Liam O’Connor', country: 'Australia', allergies: [], access: null, pref: 'Beachfront Lounge', notes: 'Group gatherings with friends.' },
  { name: 'Sophie Martin', country: 'France', allergies: ['Vegetarian'], access: null, pref: null, notes: null },
  { name: 'Daniel Smith', country: 'USA', allergies: [], access: null, pref: 'Sunset view', notes: 'Celebrating wedding anniversary.' },
  { name: 'Elena Rossi', country: 'Italy', allergies: [], access: null, pref: null, notes: 'Enjoys wood-fired flatbreads and grilled calamari.' },
]

const guests = GUEST_DATA.map((g, i) => {
  const id = `g${String(i + 1).padStart(3, '0')}`
  const emailName = g.name.toLowerCase().replace(/[^a-z0-9]/g, '.')
  const marketingConsent = rand() < 0.65
  return {
    id,
    fullName: g.name,
    phone: `+62 8${range(11, 89)} ${String(range(1000, 9999))} ${String(range(1000, 9999))}`.replace(/\s/g, ''),
    email: `${emailName}@example.com`,
    country: g.country,
    allergies: g.allergies,
    accessibility: g.access || undefined,
    seatingPreference: g.pref || undefined,
    notes: g.notes || undefined,
    marketingConsent,
    marketingConsentAt: marketingConsent ? '2026-02-10T10:00:00Z' : undefined,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-02-10T10:00:00Z',
  }
})

// ---- Reservations ----
const ANCHOR_TODAY = '2026-09-30'
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function isoMinutes(iso, time) {
  return new Date(`${iso}T${time}:00Z`).getTime()
}

const SOURCES = ['website', 'instagram', 'google', 'whatsapp', 'walk_in', 'phone', 'host']
const OCCASIONS = ['Birthday', 'Anniversary', 'Date night', 'Business dinner', 'Friends catching up', 'Celebration', null, null]
const TIME_SLOTS_LUNCH = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00']
const TIME_SLOTS_SUNSET = ['17:00', '17:30', '18:00', '18:30']
const TIME_SLOTS_DINNER = ['19:00', '19:30', '20:00', '20:30', '21:00']

const reservations = []
let codeCounter = 0
function nextCode() {
  codeCounter += 1
  const n = codeCounter.toString(36).toUpperCase().padStart(4, '0')
  return `GIOI-${n}`
}

function pickPartySize() {
  const r = rand()
  if (r < 0.45) return range(1, 2)
  if (r < 0.85) return range(3, 4)
  if (r < 0.95) return range(5, 6)
  return range(7, 8)
}

function pickTime() {
  const r = rand()
  if (r < 0.25) return pick(TIME_SLOTS_LUNCH)
  if (r < 0.65) return pick(TIME_SLOTS_SUNSET)
  return pick(TIME_SLOTS_DINNER)
}

function pickArea(party, time) {
  const isSunset = time >= '17:00' && time <= '18:30'
  if (isSunset && party <= 4 && rand() < 0.6) return 'terrace'
  if (party <= 2 && rand() < 0.2) return 'counter'
  if (party >= 3 && party <= 6 && rand() < 0.35) return 'beachfront'
  return 'main'
}

// Past 30 days: ~105 reservations
for (let d = -30; d < 0; d++) {
  const date = addDays(ANCHOR_TODAY, d)
  const slots = range(2, 5)
  for (let i = 0; i < slots; i++) {
    const time = pickTime()
    const party = pickPartySize()
    const area = pickArea(party, time)
    const guest = pick(guests)
    const r = rand()
    let status
    if (r < 0.80) status = 'completed'
    else if (r < 0.88) status = 'no_show'
    else if (r < 0.97) status = 'cancelled'
    else status = 'seated'

    const createdDaysAgo = range(1, 14)
    const createdAt = new Date(isoMinutes(date, time) - createdDaysAgo * 86400000).toISOString()
    const resId = `r${reservations.length + 1}`

    const history = [
      { id: `h_${resId}_1`, reservationId: resId, fromStatus: null, toStatus: 'confirmed', actorId: 'guest', actorName: 'Guest', at: createdAt },
    ]
    if (status === 'completed' || status === 'seated') {
      const arrivedAt = new Date(isoMinutes(date, time) - 10 * 60000).toISOString()
      const seatedAt = new Date(isoMinutes(date, time) + 2 * 60000).toISOString()
      history.push({ id: `h_${resId}_2`, reservationId: resId, fromStatus: 'confirmed', toStatus: 'arrived', actorId: 'u-host', actorName: 'Putu Sari', at: arrivedAt })
      history.push({ id: `h_${resId}_3`, reservationId: resId, fromStatus: 'arrived', toStatus: 'seated', actorId: 'u-host', actorName: 'Putu Sari', at: seatedAt })
      if (status === 'completed') {
        const completedAt = new Date(isoMinutes(date, time) + 85 * 60000).toISOString()
        history.push({ id: `h_${resId}_4`, reservationId: resId, fromStatus: 'seated', toStatus: 'completed', actorId: 'u-host', actorName: 'Putu Sari', at: completedAt })
      }
    } else if (status === 'no_show') {
      const noShowAt = new Date(isoMinutes(date, time) + 35 * 60000).toISOString()
      history.push({ id: `h_${resId}_2`, reservationId: resId, fromStatus: 'confirmed', toStatus: 'no_show', actorId: 'u-host', actorName: 'Putu Sari', reason: 'Guest did not arrive after 30 min hold', at: noShowAt })
    } else if (status === 'cancelled') {
      const cancelledAt = new Date(isoMinutes(date, time) - 5 * 3600000).toISOString()
      history.push({ id: `h_${resId}_2`, reservationId: resId, fromStatus: 'confirmed', toStatus: 'cancelled', actorId: 'guest', actorName: 'Guest', reason: 'Change of travel plans', at: cancelledAt })
    }

    reservations.push({
      id: resId,
      bookingCode: nextCode(),
      guestId: guest.id,
      date,
      time,
      partySize: party,
      seatingAreaId: area,
      occasion: rand() < 0.4 ? pick(OCCASIONS) : undefined,
      guestNotes: guest.allergies.length ? `Allergies: ${guest.allergies.join(', ')}` : undefined,
      internalNotes: guest.notes,
      source: pick(SOURCES),
      status,
      statusHistory: history,
      createdBy: pick(['u-admin', 'u-host', 'guest']),
      createdAt,
      updatedAt: history[history.length - 1]?.at || createdAt,
    })
  }
}

// Future 14 days (excluding today): ~45 forward bookings
for (let d = 1; d < 14; d++) {
  const date = addDays(ANCHOR_TODAY, d)
  const slots = range(2, 4)
  for (let i = 0; i < slots; i++) {
    const time = pickTime()
    const party = pickPartySize()
    const area = pickArea(party, time)
    const guest = pick(guests)
    const status = rand() < 0.85 ? 'confirmed' : 'pending'
    const source = pick(SOURCES)
    const createdDaysAgo = range(0, 3)
    const createdAt = new Date(isoMinutes(date, time) - (d + createdDaysAgo) * 86400000).toISOString()
    const resId = `r${reservations.length + 1}`

    reservations.push({
      id: resId,
      bookingCode: nextCode(),
      guestId: guest.id,
      date,
      time,
      partySize: party,
      seatingAreaId: area,
      occasion: rand() < 0.35 ? pick(OCCASIONS) : undefined,
      guestNotes: guest.allergies.length ? `Allergy alert: ${guest.allergies.join(', ')}` : undefined,
      internalNotes: guest.notes,
      source,
      status,
      statusHistory: [
        { id: `h_${resId}_1`, reservationId: resId, fromStatus: null, toStatus: status, actorId: 'guest', actorName: 'Guest', at: createdAt },
      ],
      createdBy: 'guest',
      createdAt,
      updatedAt: createdAt,
    })
  }
}

// Hand-curate TODAY's service reservations (anchor date: ANCHOR_TODAY)
// Simulates an active service day at 13:30 with full operational states:
// - completed lunch tables (ready for feedback!)
// - currently seated lunch tables
// - checked-in arrived table
// - cancelled / no-show tables
// - upcoming sunset & dinner bookings with VIP, allergy, and accessibility alerts
const todayDemo = [
  {
    time: '11:30',
    party: 2,
    area: 'main',
    guest: guests[0], // Cokorda Kusuma (VIP)
    source: 'website',
    status: 'completed',
    occasion: 'Business lunch',
    notes: 'Requested quiet table by window.',
  },
  {
    time: '12:00',
    party: 4,
    area: 'beachfront',
    guest: guests[4], // Mega Putri
    source: 'instagram',
    status: 'completed',
    occasion: 'Celebration',
    notes: 'Gluten-free diner in party.',
  },
  {
    time: '12:30',
    party: 2,
    area: 'terrace',
    guest: guests[13], // Komang Sanjaya
    source: 'website',
    status: 'no_show',
    occasion: null,
    notes: 'Did not answer confirmation call.',
  },
  {
    time: '13:00',
    party: 3,
    area: 'main',
    guest: guests[9], // Rai Antara
    source: 'walk_in',
    status: 'seated',
    occasion: 'Friends catching up',
    notes: 'One vegetarian menu needed.',
  },
  {
    time: '13:30',
    party: 2,
    area: 'counter',
    guest: guests[7], // Jati Wijaya
    source: 'phone',
    status: 'arrived',
    occasion: null,
    notes: 'Counter seats overlooking hearth.',
  },
  {
    time: '14:00',
    party: 2,
    area: 'main',
    guest: guests[8], // Fajar Sari
    source: 'google',
    status: 'cancelled',
    occasion: null,
    notes: 'Cancelled 4 hours prior.',
  },
  {
    time: '17:00',
    party: 4,
    area: 'beachfront',
    guest: guests[41], // Liam O’Connor
    source: 'walk_in',
    status: 'confirmed',
    occasion: 'Celebration',
    notes: 'Outdoor beachfront lounge requested.',
  },
  {
    time: '17:30',
    party: 2,
    area: 'terrace',
    guest: guests[37], // Sarah Jenkins (Repeat regular from Perth)
    source: 'website',
    status: 'confirmed',
    occasion: 'Anniversary',
    notes: 'Prime sunset view table — 10th anniversary.',
  },
  {
    time: '18:00',
    party: 5,
    area: 'terrace',
    guest: guests[2], // Gst Mahendra (Shellfish allergy)
    source: 'instagram',
    status: 'confirmed',
    occasion: 'Birthday',
    notes: 'CRITICAL: Severe shellfish allergy in party. Pre-warn kitchen.',
  },
  {
    time: '19:00',
    party: 4,
    area: 'main',
    guest: guests[3], // Ketut Sukma (Wheelchair user)
    source: 'whatsapp',
    status: 'confirmed',
    occasion: 'Family gathering',
    notes: 'Wheelchair access required — clear main entrance table.',
  },
  {
    time: '19:30',
    party: 6,
    area: 'main',
    guest: guests[18], // Darma Pratama
    source: 'website',
    status: 'pending',
    occasion: 'Business dinner',
    notes: 'Awaiting host phone confirmation for party of 6.',
  },
  {
    time: '20:00',
    party: 2,
    area: 'counter',
    guest: guests[1], // Tjok Sanjaya (Dairy-free)
    source: 'google',
    status: 'confirmed',
    occasion: 'Date night',
    notes: 'Dairy-free dessert requested.',
  },
]

for (const item of todayDemo) {
  const resId = `r_today_${reservations.length + 1}`
  const createdDaysAgo = range(1, 5)
  const createdAt = new Date(isoMinutes(ANCHOR_TODAY, item.time) - createdDaysAgo * 86400000).toISOString()
  const history = [
    { id: `h_${resId}_1`, reservationId: resId, fromStatus: null, toStatus: 'confirmed', actorId: 'guest', actorName: item.guest.fullName, at: createdAt },
  ]

  if (item.status === 'completed') {
    history.push({ id: `h_${resId}_2`, reservationId: resId, fromStatus: 'confirmed', toStatus: 'arrived', actorId: 'u-host', actorName: 'Putu Sari', at: new Date(isoMinutes(ANCHOR_TODAY, item.time) - 5 * 60000).toISOString() })
    history.push({ id: `h_${resId}_3`, reservationId: resId, fromStatus: 'arrived', toStatus: 'seated', actorId: 'u-host', actorName: 'Putu Sari', at: new Date(isoMinutes(ANCHOR_TODAY, item.time) + 2 * 60000).toISOString() })
    history.push({ id: `h_${resId}_4`, reservationId: resId, fromStatus: 'seated', toStatus: 'completed', actorId: 'u-host', actorName: 'Putu Sari', at: new Date(isoMinutes(ANCHOR_TODAY, item.time) + 80 * 60000).toISOString() })
  } else if (item.status === 'seated') {
    history.push({ id: `h_${resId}_2`, reservationId: resId, fromStatus: 'confirmed', toStatus: 'arrived', actorId: 'u-host', actorName: 'Putu Sari', at: new Date(isoMinutes(ANCHOR_TODAY, item.time) - 8 * 60000).toISOString() })
    history.push({ id: `h_${resId}_3`, reservationId: resId, fromStatus: 'arrived', toStatus: 'seated', actorId: 'u-host', actorName: 'Putu Sari', at: new Date(isoMinutes(ANCHOR_TODAY, item.time) + 3 * 60000).toISOString() })
  } else if (item.status === 'arrived') {
    history.push({ id: `h_${resId}_2`, reservationId: resId, fromStatus: 'confirmed', toStatus: 'arrived', actorId: 'u-host', actorName: 'Putu Sari', at: new Date(isoMinutes(ANCHOR_TODAY, item.time)).toISOString() })
  } else if (item.status === 'no_show') {
    history.push({ id: `h_${resId}_2`, reservationId: resId, fromStatus: 'confirmed', toStatus: 'no_show', actorId: 'u-host', actorName: 'Putu Sari', at: new Date(isoMinutes(ANCHOR_TODAY, item.time) + 35 * 60000).toISOString() })
  } else if (item.status === 'cancelled') {
    history.push({ id: `h_${resId}_2`, reservationId: resId, fromStatus: 'confirmed', toStatus: 'cancelled', actorId: 'u-host', actorName: 'Putu Sari', at: new Date(isoMinutes(ANCHOR_TODAY, item.time) - 4 * 3600000).toISOString() })
  }

  reservations.push({
    id: resId,
    bookingCode: nextCode(),
    guestId: item.guest.id,
    date: ANCHOR_TODAY,
    time: item.time,
    partySize: item.party,
    seatingAreaId: item.area,
    occasion: item.occasion || undefined,
    guestNotes: item.notes,
    internalNotes: item.guest.notes,
    source: item.source,
    status: item.status,
    statusHistory: history,
    createdBy: item.source === 'walk_in' ? 'u-host' : 'guest',
    createdAt,
    updatedAt: history[history.length - 1]?.at || createdAt,
  })
}

// ---- Seeded Audit Log Events ----
const audit = [
  {
    id: 'aud_001',
    at: new Date(isoMinutes(ANCHOR_TODAY, '12:55')).toISOString(),
    actorId: 'u-host',
    actorName: 'Putu Sari',
    action: 'reservation.status_changed',
    entityType: 'reservation_status',
    entityId: reservations.find((r) => r.date === ANCHOR_TODAY && r.status === 'completed')?.id || 'r_today_1',
    changes: { status: { from: 'seated', to: 'completed' } },
    note: 'Completed dining service for table.',
  },
  {
    id: 'aud_002',
    at: new Date(isoMinutes(ANCHOR_TODAY, '12:56')).toISOString(),
    actorId: 'u-host',
    actorName: 'Putu Sari',
    action: 'feedback_link.sent',
    entityType: 'feedback_link',
    entityId: reservations.find((r) => r.date === ANCHOR_TODAY && r.status === 'completed')?.id || 'r_today_1',
    note: 'Sent WhatsApp feedback link to Cokorda Kusuma',
  },
  {
    id: 'aud_003',
    at: new Date(isoMinutes(ANCHOR_TODAY, '13:03')).toISOString(),
    actorId: 'u-host',
    actorName: 'Putu Sari',
    action: 'reservation.status_changed',
    entityType: 'reservation_status',
    entityId: reservations.find((r) => r.date === ANCHOR_TODAY && r.status === 'seated')?.id || 'r_today_4',
    changes: { status: { from: 'arrived', to: 'seated' } },
    note: 'Seated at Beachfront Lounge table 12.',
  },
  {
    id: 'aud_004',
    at: new Date(isoMinutes(ANCHOR_TODAY, '13:30')).toISOString(),
    actorId: 'u-host',
    actorName: 'Putu Sari',
    action: 'reservation.status_changed',
    entityType: 'reservation_status',
    entityId: reservations.find((r) => r.date === ANCHOR_TODAY && r.status === 'arrived')?.id || 'r_today_5',
    changes: { status: { from: 'confirmed', to: 'arrived' } },
    note: 'Guest checked in at host stand.',
  },
  {
    id: 'aud_005',
    at: new Date(isoMinutes(ANCHOR_TODAY, '13:05')).toISOString(),
    actorId: 'u-host',
    actorName: 'Putu Sari',
    action: 'reservation.status_changed',
    entityType: 'reservation_status',
    entityId: reservations.find((r) => r.date === ANCHOR_TODAY && r.status === 'no_show')?.id || 'r_today_3',
    changes: { status: { from: 'confirmed', to: 'no_show' } },
    note: 'Marked no-show after 30 minutes grace period expired.',
  },
  {
    id: 'aud_006',
    at: new Date(isoMinutes(ANCHOR_TODAY, '10:15')).toISOString(),
    actorId: 'u-admin',
    actorName: 'Yodha Kautsar',
    action: 'settings.updated',
    entityType: 'settings',
    entityId: 'settings',
    changes: { overCapacityAlertPercent: { from: 90, to: 85 } },
    note: 'Adjusted over-capacity alert threshold for sunset peak season.',
  },
  {
    id: 'aud_007',
    at: new Date(isoMinutes(addDays(ANCHOR_TODAY, -1), '16:00')).toISOString(),
    actorId: 'u-admin',
    actorName: 'Yodha Kautsar',
    action: 'seating_area.updated',
    entityType: 'seating_area',
    entityId: 'terrace',
    changes: { capacity: { from: 12, to: 14 } },
    note: 'Added 2 terrace covers for sunset dining.',
  },
  {
    id: 'aud_008',
    at: new Date(isoMinutes(addDays(ANCHOR_TODAY, -2), '11:00')).toISOString(),
    actorId: 'u-admin',
    actorName: 'Yodha Kautsar',
    action: 'user.updated',
    entityType: 'user',
    entityId: 'u-host',
    note: 'Updated host access profile.',
  },
]

// ---- Feedback Responses (16 realistic entries) ----
const completedPast = reservations.filter((r) => r.status === 'completed' && r.date < ANCHOR_TODAY)
const feedbackReviews = [
  {
    rating: 5,
    comments: 'The seafood platter at sunset was extraordinary. Watching the waves while dining was an unforgettable Bali experience.',
    tags: ['Seafood freshness', 'Sunset view', 'Attentive service'],
  },
  {
    rating: 5,
    comments: 'Staff handled my shellfish allergy with immense care. The kitchen even sent a personalized amuse-bouche.',
    tags: ['Allergy care', 'Attentive service'],
  },
  {
    rating: 4,
    comments: 'Great grilled fish and cocktails, though our table on the terrace was delayed about 10 minutes past our booking time.',
    tags: ['Seafood freshness', 'Cocktails & wine'],
  },
  {
    rating: 5,
    comments: 'Best coconut prawns and sambal in Kuta. Coming back before our flight home.',
    tags: ['Seafood freshness', 'Value'],
  },
  {
    rating: 5,
    comments: 'Very attentive service for our 10th anniversary. The complimentary dessert and personalized greeting card were wonderful.',
    tags: ['Attentive service', 'Sunset view', 'Atmosphere'],
  },
  {
    rating: 4,
    comments: 'Atmosphere is stunning right on the water. Music volume was slightly loud as the evening progressed.',
    tags: ['Sunset view', 'Atmosphere'],
  },
  {
    rating: 5,
    comments: 'Chef’s counter seat was half the experience! Loved watching the open-fire cooking and chatting with the team.',
    tags: ['Atmosphere', 'Pacing & timing'],
  },
  {
    rating: 5,
    comments: 'We ordered the tasting menu with Australian wine pairing. Flawless pacing from start to finish.',
    tags: ['Cocktails & wine', 'Pacing & timing', 'Seafood freshness'],
  },
  {
    rating: 3,
    comments: 'Food was delicious, but service felt a bit rushed during the 18:00 sunset peak rush.',
    tags: ['Pacing & timing'],
  },
  {
    rating: 5,
    comments: 'The gluten-free options are properly considered, not an afterthought. Appreciated the separate preparation.',
    tags: ['Allergy care', 'Attentive service'],
  },
  {
    rating: 4,
    comments: 'Crispy pork belly and grilled barramundi were top tier. Cocktails took a few minutes longer than expected.',
    tags: ['Seafood freshness', 'Cocktails & wine'],
  },
  {
    rating: 5,
    comments: 'Spectacular sunset vantage point. Best restaurant view in Discovery Mall by far.',
    tags: ['Sunset view', 'Atmosphere'],
  },
  {
    rating: 5,
    comments: 'Staff remembered our names and our table preference from our visit last year. Remarkable hospitality.',
    tags: ['Attentive service', 'Atmosphere'],
  },
  {
    rating: 4,
    comments: 'Delicious seafood and friendly Balinese warmth throughout the evening.',
    tags: ['Seafood freshness', 'Value'],
  },
  {
    rating: 5,
    comments: 'Our family of 6 had a fantastic beachfront lunch. Kids loved the coconut satay.',
    tags: ['Value', 'Attentive service'],
  },
  {
    rating: 5,
    comments: 'Signature cocktails are inventive and fresh. The chili-passionfruit margarita is a must try.',
    tags: ['Cocktails & wine', 'Atmosphere'],
  },
]

const feedback = feedbackReviews.map((rev, i) => {
  const res = completedPast[i % completedPast.length]
  const guest = guests.find((g) => g.id === res.guestId) || guests[0]
  return {
    id: `fb${String(i + 1).padStart(3, '0')}`,
    reservationId: res.id,
    guestId: guest.id,
    rating: rev.rating,
    comments: rev.comments,
    serviceTags: rev.tags,
    submittedAt: new Date(new Date(res.updatedAt).getTime() + 2 * 3600000).toISOString(),
  }
})

// ---- Write files ----
function writeJson(name, data) {
  writeFileSync(resolve(outDir, name), JSON.stringify(data, null, 2) + '\n')
}
writeJson('settings.json', settings)
writeJson('users.json', users)
writeJson('guests.json', guests)
writeJson('reservations.json', reservations)
writeJson('audit.json', audit)
writeJson('feedback.json', feedback)

console.log(`Successfully generated demo data:
  - ${reservations.length} total reservations (${reservations.filter((r) => r.date === ANCHOR_TODAY).length} for today)
  - ${guests.length} guests (${guests.filter((g) => g.allergies.length).length} with allergies, ${guests.filter((g) => g.accessibility).length} with accessibility needs)
  - ${users.length} users
  - ${settings.seatingAreas.length} seating areas
  - ${audit.length} audit events
  - ${feedback.length} feedback responses
`)
