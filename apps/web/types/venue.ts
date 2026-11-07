export interface Venue {
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
  openingHours: Record<string, { open: string; close: string }>
  closedDates: string[]
  bookingIntervalMinutes: number
  partySizeLimits: { min: number; max: number }
  leadTimeMinutes: number
  cutoffMinutes: number
  diningMinutes: number
  noShowTargetPercent: number
  overCapacityAlertPercent: number
  seatingAreas: Array<{
    id: string
    name: string
    capacity: number
    bookable: boolean
    minParty?: number
    maxParty?: number
  }>
  cancellationPolicy: string
  feedbackTitle?: string
  feedbackSubtitle?: string
  feedbackTags?: string[]
  feedbackMessageTemplate: string
}

export interface SlotAvailability {
  time: string
  open: boolean
  reason?: 'closed' | 'past' | 'lead_time' | 'cutoff' | 'full'
  remaining?: number
}

export interface ReservationPublic {
  bookingCode: string
  date: string
  time: string
  partySize: number
  seatingArea: string
  status: string
}

export interface CreateReservationBody {
  guestName: string
  phone: string
  email?: string
  date: string
  time: string
  partySize: number
  seatingAreaId?: string
  occasion?: string
  guestNotes?: string
  idempotencyKey?: string
  turnstileToken?: string
}

export interface CreateReservationResponse {
  bookingCode: string
  reservationId: string
  status: string
}

export interface FeedbackBody {
  rating: number
  comments?: string
  serviceTags?: string[]
}

export interface FeedbackResponse {
  id: string
  rating: number
  submittedAt: string
}

export interface StaffUser {
  id: string
  name: string
  login: string
  isSuperAdmin: boolean
}
