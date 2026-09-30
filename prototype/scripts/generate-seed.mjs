#!/usr/bin/env node
// Generates src/mock/*.json for the prototype.
// Deterministic — same output every run because it doesn't depend on the current date.
// We anchor "today" to a fixed reference so reservations stay evenly distributed around
// a stable midpoint and tests can reason about counts. The Pinia store will use the
// browser clock for runtime; seed JSON dates are stored as absolute "YYYY-MM-DD"
// strings and shifted onto the browser's local "today" when the app first loads.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../src/mock')
mkdirSync(outDir, { recursive: true })

// Deterministic PRNG (mulberry32) so every run produces identical JSON.
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
const rand = rng(42)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const range = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))

// ---- Settings / restaurant info ----
const settings = {
  restaurant: {
    name: 'GIOI Bali',
    tagline: 'Balinese garden kitchen, slow-fire cooking, sunset views.',
    intro:
      'A small, ingredient-led restaurant tucked into a working garden in Canggu. Open daily for lunch and dinner, with a few indoor tables, a sunset terrace, and a chef\'s counter overlooking the wood-fired hearth.',
    address: 'Jl. Subak Canggu No. 88, Canggu, Bali 80361',
    phone: '+62 361 555 0142',
    whatsapp: '+62 812 5555 0142',
    email: 'hello@gioi.bali',
    mapsUrl: 'https://maps.google.com/?q=GIOI+Bali+Canggu',
    hoursSummary: 'Daily 12:00–22:00 · Friday and Saturday until 23:00',
    heroEmoji: '🌿',
  },
  openingHours: {
    mon: { open: '12:00', close: '22:00' },
    tue: { open: '12:00', close: '22:00' },
    wed: { open: '12:00', close: '22:00' },
    thu: { open: '12:00', close: '22:00' },
    fri: { open: '12:00', close: '23:00' },
    sat: { open: '12:00', close: '23:00' },
    sun: { open: '12:00', close: '22:00' },
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
    { id: 'terrace', name: 'Sunset Terrace', capacity: 12, bookable: true, minParty: 2 },
    { id: 'counter', name: "Chef's Counter", capacity: 6, bookable: true, maxParty: 4 },
  ],
  cancellationPolicy:
    'Please cancel or reschedule at least 4 hours before your booking. Late cancellations and no-shows may be charged a 200,000 IDR per-person fee.',
}

// ---- Users ----
const users = [
  {
    id: 'u-admin',
    name: 'Made Wirawan',
    login: 'made',
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
]

// ---- Guests (40) ----
const FIRST = [
  'Adi','Ayu','Bayu','Citra','Dewi','Eka','Fajar','Gede','Hadi','Indra',
  'Kadek','Komang','Luh','Made','Nyoman','Putu','Rai','Ratna','Sari','Wayan',
  'Yanti','Ketut','Anak','Bagus','Cokorda','Gst','I','Ni','Sang','Tjok',
  'Aria','Darma','Gangga','Indah','Jati','Karsa','Lestari','Mega','Nara','Oka',
]
const LAST = [
  'Wirawan','Sari','Dewi','Permata','Mahendra','Putri','Sanjaya','Wijaya','Kusuma','Pratama',
  'Anggraini','Handayani','Sukma','Antara','Lestari','Cahyani','Saputra','Pranata','Nugraha','Gunawan',
]
const COUNTRIES = ['Indonesia', 'Australia', 'Singapore', 'Japan', 'USA', 'France', 'Germany', 'Brazil', 'UK', 'Netherlands']
const ALLERGENS = [
  'Peanut allergy', 'Tree-nut allergy', 'Shellfish allergy', 'Gluten-free',
  'Dairy-free', 'Vegan', 'Vegetarian', 'Soy allergy', 'Sesame allergy',
]
const ACCESS = [
  'Wheelchair user',
  'Hearing assistance',
  'Service dog',
  'Eldery mobility — ground floor only',
]
const SEAT_PREFS = [
  'Window seat', 'Quiet corner', 'Sunset view', 'Counter seat',
  'Booth for two', 'Family-friendly section',
]
const NOTES = [
  'Always orders the tasting — let the chef know.',
  'Birthday in March — send a small dessert.',
  'Prefers dry whites; loves the pét-nat.',
  'Often brings business guests — discreet service.',
  'Newly vegetarian — keep menu options handy.',
  'Returning regular — sometimes books last-minute.',
]

const guests = []
const allergyGuestIndices = new Set()
const accessGuestIndices = new Set()
for (let i = 0; i < 40; i++) {
  const fullName = `${pick(FIRST)} ${pick(LAST)}`
  const country = pick(COUNTRIES)
  const phone = `+62 8${range(11, 99)} ${String(range(1000, 9999))} ${String(range(1000, 9999))}`.replace(/\s/g, '')
  const id = `g${String(i + 1).padStart(3, '0')}`
  // ~25% have allergies, ~12% have accessibility needs, ~50% have seating preference
  const allergies = rand() < 0.25 ? [pick(ALLERGENS)] : []
  const accessibility = rand() < 0.12 ? pick(ACCESS) : undefined
  const seatingPreference = rand() < 0.5 ? pick(SEAT_PREFS) : undefined
  const notes = rand() < 0.18 ? pick(NOTES) : undefined
  const marketingConsent = rand() < 0.45
  const guest = {
    id,
    fullName,
    phone,
    email: rand() < 0.7 ? `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com` : undefined,
    country,
    allergies,
    accessibility,
    seatingPreference,
    notes,
    marketingConsent,
    marketingConsentAt: marketingConsent ? '2026-01-15T10:00:00Z' : undefined,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  }
  guests.push(guest)
  if (allergies.length) allergyGuestIndices.add(i)
  if (accessibility) accessGuestIndices.add(i)
}

// ---- Reservations ----
// Anchor "today" for the JSON to 2026-09-30 (matches the system date). The store
// remaps dates onto the browser's local "today" on hydration, keeping the shape
// (past 30 / next 14) consistent regardless of when the demo loads.
const ANCHOR_TODAY = '2026-09-30'
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function isoMinutes(iso, time) {
  return new Date(`${iso}T${time}:00Z`).getTime()
}

const SOURCES = ['website', 'instagram', 'google', 'whatsapp', 'chope', 'walk_in', 'phone', 'host']
const OCCASIONS = ['Birthday', 'Anniversary', 'Date night', 'Business dinner', 'Friends catching up', 'Celebration', null, null, null]
const TIME_SLOTS_LUNCH = ['12:00', '12:30', '13:00', '13:30', '14:00']
const TIME_SLOTS_DINNER = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00']

const reservations = []
let codeCounter = 0
function nextCode() {
  codeCounter += 1
  const n = codeCounter.toString(36).toUpperCase().padStart(4, '0')
  return `GIOI-${n}`
}

// Distribute party sizes across capacity buckets
function pickPartySize() {
  const r = rand()
  if (r < 0.4) return range(1, 2)
  if (r < 0.85) return range(3, 4)
  if (r < 0.97) return range(5, 6)
  return range(7, 8)
}
function pickTime() {
  const r = rand()
  return r < 0.3 ? pick(TIME_SLOTS_LUNCH) : pick(TIME_SLOTS_DINNER)
}
function pickArea(party) {
  const areas = settings.seatingAreas.filter((a) => a.bookable)
  const candidates = areas.filter((a) =>
    (!a.minParty || party >= a.minParty) && (!a.maxParty || party <= a.maxParty),
  )
  return (candidates.length ? candidates : areas)[Math.floor(rand() * (candidates.length || areas.length))].id
}

// Past 30 days: ~80 reservations, mix of completed / no_show / cancelled
for (let d = -30; d < 0; d++) {
  const date = addDays(ANCHOR_TODAY, d)
  // 1–6 reservations per day (avg ~3.5 → ~105 over 30 days, trimmed to ~85 after edits)
  const slots = range(1, 6)
  for (let i = 0; i < slots; i++) {
    const time = pickTime()
    const party = pickPartySize()
    const area = pickArea(party)
    const guest = guests[range(0, guests.length - 1)]
    const r = rand()
    let status
    if (r < 0.78) status = 'completed'
    else if (r < 0.88) status = 'no_show'
    else if (r < 0.97) status = 'cancelled'
    else status = 'arrived' // very recent past days may still be in service
    const createdDaysAgo = range(2, 30)
    const createdAt = new Date(isoMinutes(date, time) - createdDaysAgo * 86400000).toISOString()
    reservations.push({
      id: `r${reservations.length + 1}`,
      bookingCode: nextCode(),
      guestId: guest.id,
      date,
      time,
      partySize: party,
      seatingAreaId: area,
      occasion: rand() < 0.45 ? pick(OCCASIONS) : undefined,
      guestNotes: rand() < 0.3
        ? pick([
            'Window seat please.',
            'One vegetarian diner in the party.',
            'Celebrating a birthday — small dessert welcome.',
            'Quiet table for business chat.',
            'Allergic to shellfish.',
          ])
        : undefined,
      internalNotes: rand() < 0.15
        ? pick([
            'Repeat VIP — pre-stock the pét-nat.',
            'Service dog arrives with the guest.',
            'Wheelchair access — main entrance only.',
            'Allergy alert on file.',
          ])
        : undefined,
      source: pick(SOURCES),
      status,
      createdBy: pick(['u-admin', 'u-host', 'system', 'guest']),
      createdAt,
      updatedAt: createdAt,
    })
  }
}
// Future 14 days: ~40 reservations, confirmed or pending (some walk_in for today)
for (let d = 0; d < 14; d++) {
  const date = addDays(ANCHOR_TODAY, d)
  const slots = d === 0 ? range(3, 6) : range(1, 4)
  for (let i = 0; i < slots; i++) {
    const time = pickTime()
    const party = pickPartySize()
    const area = pickArea(party)
    const guest = guests[range(0, guests.length - 1)]
    const status = d === 0
      ? (rand() < 0.5 ? 'confirmed' : 'pending')
      : (rand() < 0.85 ? 'confirmed' : 'pending')
    const source = d === 0 && rand() < 0.4 ? 'walk_in' : pick(SOURCES)
    const createdDaysAgo = range(0, Math.max(1, d))
    const createdAt = new Date(isoMinutes(date, time) - createdDaysAgo * 86400000).toISOString()
    reservations.push({
      id: `r${reservations.length + 1}`,
      bookingCode: nextCode(),
      guestId: guest.id,
      date,
      time,
      partySize: party,
      seatingAreaId: area,
      occasion: rand() < 0.35 ? pick(OCCASIONS) : undefined,
      guestNotes: rand() < 0.25
        ? pick([
            'Outdoor seating if possible.',
            'One diner is gluten-free.',
            'Bringing a small cake for a birthday.',
            'Anniversary — would love a quiet spot.',
          ])
        : undefined,
      internalNotes: undefined,
      source,
      status,
      createdBy: pick(['u-admin', 'u-host', 'guest', 'system']),
      createdAt,
      updatedAt: createdAt,
    })
  }
}

// Hand-curate a couple of "today" reservations with allergy/accessibility
// alerts so the Host view and action cues are demonstrable without random luck.
function ensureTodayAllergyDemo() {
  const today = ANCHOR_TODAY
  const allergyGuest = [...allergyGuestIndices][0]
  const accessGuest = [...accessGuestIndices][0]
  const allergyGuestId = allergyGuest !== undefined ? guests[allergyGuest].id : null
  const accessGuestId = accessGuest !== undefined ? guests[accessGuest].id : null

  // Remove existing today's reservations to control the demo
  const todayReservations = reservations.filter((r) => r.date === today)
  for (const r of todayReservations) {
    reservations.splice(reservations.indexOf(r), 1)
  }

  const seedTimes = ['12:30', '13:00', '19:00', '19:30', '20:00']
  const demo = [
    { time: '12:30', party: 2, source: 'website', guestId: guests[0].id, status: 'confirmed' },
    { time: '13:00', party: 4, source: 'walk_in', guestId: guests[1].id, status: 'arrived' },
    {
      time: '19:00',
      party: 2,
      source: 'website',
      guestId: allergyGuestId ?? guests[2].id,
      status: 'confirmed',
      guestNotes: 'Peanut allergy — please brief the kitchen.',
      internalNotes: 'Allergy alert on file.',
    },
    { time: '19:30', party: 5, source: 'instagram', guestId: guests[3].id, status: 'confirmed' },
    {
      time: '20:00',
      party: 3,
      source: 'whatsapp',
      guestId: accessGuestId ?? guests[4].id,
      status: 'confirmed',
      guestNotes: 'Wheelchair user — main entrance.',
      internalNotes: 'Accessibility alert — ground floor only.',
    },
  ]
  for (const r of demo) {
    reservations.push({
      id: `r${reservations.length + 1}`,
      bookingCode: nextCode(),
      guestId: r.guestId,
      date: today,
      time: r.time,
      partySize: r.party,
      seatingAreaId: r.party >= 4 ? 'main' : (r.party === 2 ? 'terrace' : 'main'),
      occasion: undefined,
      guestNotes: r.guestNotes,
      internalNotes: r.internalNotes,
      source: r.source,
      status: r.status,
      createdBy: 'guest',
      createdAt: new Date(isoMinutes(today, r.time) - 86400000 * 2).toISOString(),
      updatedAt: new Date(isoMinutes(today, r.time) - 86400000 * 2).toISOString(),
    })
  }
  // Touch seedTimes so the unused warning is suppressed; also keeps the list in sync
  void seedTimes
}
ensureTodayAllergyDemo()

// ---- Audit log (seed empty — actions will append on first mutation) ----
const audit = []

// ---- Write files ----
function writeJson(name, data) {
  writeFileSync(resolve(outDir, name), JSON.stringify(data, null, 2) + '\n')
}
writeJson('settings.json', settings)
writeJson('users.json', users)
writeJson('guests.json', guests)
writeJson('reservations.json', reservations)
writeJson('audit.json', audit)

console.log(`Wrote:
  - ${reservations.length} reservations (${reservations.filter((r) => r.date < ANCHOR_TODAY).length} past, ${reservations.filter((r) => r.date >= ANCHOR_TODAY).length} today/future)
  - ${guests.length} guests (${allergyGuestIndices.size} with allergies, ${accessGuestIndices.size} with accessibility needs)
  - ${users.length} users
  - ${settings.seatingAreas.length} seating areas
`)