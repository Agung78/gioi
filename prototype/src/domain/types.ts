// Pure domain types — no Vue, no Pinia, no localStorage.
// All times are local 24h "HH:MM". All dates are local "YYYY-MM-DD".

export type Role = 'SUPER_ADMIN' | 'HOST'

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type Channel =
  | 'website'
  | 'instagram'
  | 'google'
  | 'whatsapp'
  | 'chope'
  | 'walk_in'
  | 'phone'
  | 'host'

export const CHANNELS: Channel[] = [
  'website',
  'instagram',
  'google',
  'whatsapp',
  'chope',
  'walk_in',
  'phone',
  'host',
]

export const ACTIVE_STATUSES: ReservationStatus[] = [
  'pending',
  'confirmed',
  'arrived',
  'seated',
]

export const TERMINAL_STATUSES: ReservationStatus[] = [
  'completed',
  'cancelled',
  'no_show',
]

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export interface DailyHours {
  open: string // "HH:MM"
  close: string // "HH:MM"
}

export type OpeningHours = Record<DayOfWeek, DailyHours>

export interface SeatingArea {
  id: string
  name: string
  capacity: number // total covers
  bookable: boolean
  minParty?: number
  maxParty?: number
}

export interface RestaurantInfo {
  name: string
  tagline: string
  intro: string
  address: string
  phone: string
  whatsapp: string
  email: string
  mapsUrl: string
  hoursSummary: string
  heroEmoji: string
}

export interface Settings {
  restaurant: RestaurantInfo
  openingHours: OpeningHours
  closedDates: string[] // "YYYY-MM-DD"
  bookingIntervalMinutes: number
  partySizeLimits: { min: number; max: number }
  leadTimeMinutes: number
  cutoffMinutes: number
  noShowTargetPercent: number
  overCapacityAlertPercent: number
  seatingAreas: SeatingArea[]
  cancellationPolicy: string
}

export interface Guest {
  id: string
  fullName: string
  phone: string
  email?: string
  country?: string
  allergies: string[]
  accessibility?: string
  seatingPreference?: string
  notes?: string // internal notes only
  marketingConsent: boolean
  marketingConsentAt?: string
  createdAt: string // ISO
  updatedAt: string // ISO
}

export interface Reservation {
  id: string
  bookingCode: string // human-readable like GIOI-AB12CD
  guestId: string
  date: string // "YYYY-MM-DD"
  time: string // "HH:MM"
  partySize: number
  seatingAreaId: string
  occasion?: string
  guestNotes?: string // sensitive: dietary / allergies / accessibility / requests — never on public pages
  internalNotes?: string
  source: Channel
  status: ReservationStatus
  statusHistory?: ReservationStatusEvent[]
  createdBy: string // user id or 'system' or 'guest'
  createdAt: string // ISO
  updatedAt: string // ISO
}

export interface ReservationStatusEvent {
  id: string
  reservationId: string
  fromStatus: ReservationStatus | null
  toStatus: ReservationStatus
  actorId: string // user id or 'guest' or 'system'
  actorName: string
  reason?: string
  at: string // ISO
}

export type AuditEntityType = 'reservation' | 'settings' | 'seating_area' | 'user' | 'reservation_status'

export interface AuditEvent {
  id: string
  at: string // ISO
  actorId: string
  actorName: string
  action: string // e.g. 'reservation.created', 'settings.updated', 'reservation.status_changed'
  entityType: AuditEntityType
  entityId: string
  changes?: Record<string, { from: unknown; to: unknown }>
  note?: string
}

export interface User {
  id: string
  name: string
  login: string
  role: Role
  active: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}