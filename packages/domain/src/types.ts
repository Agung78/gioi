// Pure domain types — no Vue, no Pinia, no localStorage.
// All times are local 24h "HH:MM". All dates are local "YYYY-MM-DD".

export type Role = 'host' | 'admin'

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
  | 'walk_in'
  | 'phone'
  | 'host'
  | 'chope_import'

export const CHANNELS: Channel[] = [
  'website',
  'instagram',
  'google',
  'whatsapp',
  'walk_in',
  'phone',
  'host',
  'chope_import',
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

export interface DailyHours {
  open: string // "HH:MM"
  close: string // "HH:MM"
}

export type OpeningHours = Record<DayOfWeek, DailyHours>

export interface SeatingArea {
  id: string
  name: string
  capacity: number // total covers per slot
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
}

export interface Settings {
  restaurant: RestaurantInfo
  timeZone: string // IANA, e.g. "Asia/Makassar"
  openingHours: OpeningHours
  closedDates: string[] // "YYYY-MM-DD"
  bookingIntervalMinutes: number
  partySizeLimits: { min: number; max: number }
  leadTimeMinutes: number
  cutoffMinutes: number
  noShowTargetPercent: number
  overCapacityAlertPercent: number
  diningMinutes: number
  seatingAreas: SeatingArea[]
  cancellationPolicy: string
  noticeEnabled?: boolean
  noticeDate?: string | null
  noticeText?: string
  feedbackMessageTemplate: string
  feedbackTitle?: string
  feedbackSubtitle?: string
  feedbackTags?: string[]
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
  bookingCode: string // human-readable, random
  guestId: string
  guestName?: string // resolved guest full name (admin analytics only)
  guestPhone?: string | null // resolved guest phone (admin analytics only)
  guestEmail?: string | null // resolved guest email (admin analytics CSV only)
  guestAllergies?: string[] // resolved guest allergies (admin analytics CSV only)
  guestAccessibility?: string | null // resolved guest accessibility (admin analytics CSV only)
  date: string // "YYYY-MM-DD" local
  time: string // "HH:MM" local
  partySize: number
  seatingAreaId: string
  occasion?: string
  guestNotes?: string // sensitive — never on public pages
  internalNotes?: string // sensitive — never on public pages
  source: Channel
  status: ReservationStatus
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

export interface FeedbackResponse {
  id: string
  reservationId: string
  guestId: string
  rating: number
  comments: string
  serviceTags: string[]
  submittedAt: string
}

export type AuditEntityType =
  | 'reservation'
  | 'settings'
  | 'seating_area'
  | 'user'
  | 'reservation_status'
  | 'feedback_link'

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

// --- API response types (shared between API and web) ---

export interface PublicVenue {
  id: string
  slug: string
  name: string
  tagline: string
  intro: string
  address: string
  phone: string
  whatsapp: string
  email: string
  mapsUrl: string
  timeZone: string
  openingHours: OpeningHours
  closedDates: string[]
  bookingIntervalMinutes: number
  partySizeLimits: { min: number; max: number }
  leadTimeMinutes: number
  cutoffMinutes: number
  seatingAreas: SeatingArea[]
  cancellationPolicy: string
  noticeEnabled: boolean
  noticeDate: string | null
  noticeText: string
  feedbackTitle?: string
  feedbackSubtitle?: string
  feedbackTags?: string[]
}

export interface PublicSlot {
  time: string
  open: boolean
  reason?: 'closed' | 'past' | 'full'
  remaining?: number
}

export interface PublicAvailability {
  date: string
  timeZone: string
  slots: PublicSlot[]
}

export interface PublicReservation {
  bookingCode: string
  date: string
  time: string
  partySize: number
  seatingArea: string
  status: ReservationStatus
}

export interface PublicFeedback {
  rating: number
  comments: string
  serviceTags: string[]
  submittedAt: string
}

export interface StaffReservation {
  id: string
  bookingCode: string
  guestId: string
  guestName: string
  guestPhone?: string
  partySize: number
  startsAt: string // ISO UTC
  seatingArea: string
  status: ReservationStatus
  source: Channel
  occasion?: string
  guestNotes?: string
  allergies: string[]
  accessibility?: string
  tableIds: string[]
}

// --- Floor plan (docs/floor_plan_seating.md) ---
// Plan space: FLOOR_PLAN_WIDTH × height units; x/y = item centre; rotation = degrees clockwise.

export const FLOOR_PLAN_WIDTH = 1200
export const FLOOR_PLAN_DEFAULT_HEIGHT = 900
export const FLOOR_TABLE_MAX_SEATS = 16

export interface FloorTable {
  id?: string
  seatingAreaId: string
  seats: number
  x: number
  y: number
  rotation: number
}

export interface FloorObject {
  id?: string
  label: string
  width: number
  height: number
  color: string // #RRGGBB
  x: number
  y: number
  rotation: number
}

export interface FloorPlanArea {
  id: string
  name: string
  bookable: boolean
  minParty?: number | null
  maxParty?: number | null
}

export interface PublicFloorPlan {
  width: number
  height: number
  image: string | null // data URL; render only via SVG <image href>
  areas: FloorPlanArea[]
  tables: FloorTable[]
  objects: FloorObject[]
}

// GET /public/venues/:slug/table-availability?date&time&partySize. Tables a new booking cannot take at that time.
export interface TableAvailability {
  unavailableTableIds: string[] // already held in the dining window, or fewer seats than partySize
}

// GET /admin/venues/:id/table-availability?date&time&partySize[&excludeReservationId]. Staff view of why a table can't be taken.
// held = guest arrived/seated, or reservation not yet past its grace window. late = pending/confirmed holder past start + graceMinutes (staff may take over).
export interface StaffTableState {
  tableId: string
  reason: 'held' | 'late'
  holder?: { reservationId: string; guestName: string; time: string; status: ReservationStatus } // time = local HH:MM
}
export interface StaffTableAvailability {
  tables: StaffTableState[]
}

export interface AdminFloorPlan extends PublicFloorPlan {
  canEdit: boolean // venue admin of this venue
}
