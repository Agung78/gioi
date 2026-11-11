import { useAuthStore } from '@/stores/auth' // circular with the store, but only used at call time
import type { Channel, ReservationStatus, StaffTableAvailability } from '@gioi/domain'
import type { AdminFloorPlan, FloorObject, FloorPlanArea, FloorTable } from '@gioi/domain'

export interface StaffReservation {
	id: string
	bookingCode: string
	guestId: string
	guestName: string
	guestPhone?: string | null
	partySize: number
	startsAt: string // ISO UTC
	seatingArea: string
	status: ReservationStatus
	source: Channel
	occasion?: string | null
	guestNotes?: string | null
	internalNotes?: string | null
	tableId: string | null
	allergies: string[]
	accessibility?: string | null
	time: string
	date: string
	isRepeat: boolean
}

const API = '/api'

export function apiFetch<T = unknown>(
	input: RequestInfo | URL,
	init?: Parameters<typeof $fetch>[1],
) {
	const path = String(input)
	return $fetch<T>(API + (path.startsWith('/') ? path : '/' + path), {
		credentials: 'include',
		// Session revoked (e.g. logged in on another device) → drop local state, go to login.
		async onResponseError({ response }) {
			if (response.status !== 401 || path.startsWith('/staff/login') || path.startsWith('/staff/me')) return
			useAuthStore().user = null
			await navigateTo('/login?reason=session')
		},
		...init,
	})
}

export interface StaffUser {
	id: string
	name: string
	login: string
	role: string
	isSuperAdmin?: boolean
	venueIds?: string[]
	venueRoles?: Record<string, string>
}

export async function fetchMe(): Promise<StaffUser | null> {
	try {
		return (await apiFetch<{ user: StaffUser } | null>('/staff/me'))?.user ?? null
	} catch {
		return null
	}
}

export interface DayView {
	date: string
	venueId: string
	reservations: StaffReservation[]
	areas: Array<{ id: string; name: string }>
	venue: { slug: string; name: string; feedbackMessageTemplate: string }
}

export async function fetchDay(date?: string): Promise<DayView> {
	return apiFetch<DayView>('/staff/day', { query: date ? { date } : undefined })
}

export interface CreateWalkInBody {
	guestName: string
	phone?: string
	email?: string
	date: string
	time: string
	partySize: number
	seatingAreaId?: string
	tableId?: string
	takeOver?: boolean
	occasion?: string
	guestNotes?: string
	internalNotes?: string
	source: Channel
	venueId?: string
	country?: string
}

export async function createWalkIn(body: CreateWalkInBody): Promise<{ bookingCode: string; reservationId: string }> {
	return apiFetch('/staff/reservations', { method: 'POST', body })
}

export interface UpdateReservationBody {
	partySize?: number
	tableId?: string
	seatingAreaId?: string
	startsAt?: string
	occasion?: string
	guestNotes?: string
	internalNotes?: string
	source?: Channel
}

export async function updateReservation(
	id: string,
	body: UpdateReservationBody,
): Promise<{ bookingCode: string; status: ReservationStatus }> {
	return apiFetch(`/staff/reservations/${id}`, { method: 'PATCH', body })
}

export async function fetchStaffTableAvailability(
	venueId: string,
	query: { date: string; time: string; partySize: number; excludeReservationId?: string },
): Promise<StaffTableAvailability> {
	return apiFetch<StaffTableAvailability>(`/admin/venues/${venueId}/table-availability`, { query })
}

export interface ChangeStatusBody {
	to: ReservationStatus
}

export async function changeReservationStatus(
	id: string,
	body: ChangeStatusBody,
): Promise<{ bookingCode: string; status: ReservationStatus }> {
	return apiFetch(`/staff/reservations/${id}/status`, { method: 'POST', body })
}

export interface NextStatuses {
	next: ReservationStatus[]
}

export async function fetchNextStatuses(id: string): Promise<NextStatuses> {
	return apiFetch<NextStatuses>(`/staff/reservations/${id}/next-statuses`)
}

export interface StaffGuest {
	id: string
	fullName: string
	phone: string | null
	email: string | null
	country: string | null
	allergies: string[]
	accessibility: string | null
	seatingPreference: string | null
	notes: string | null
	marketingConsent: boolean
	createdAt: string
	visits?: number // completed/arrived/seated count; only set by the search endpoint
	reservations: Array<{
		id: string
		bookingCode: string
		date: string
		time: string
		partySize: number
		seatingArea: string
		status: ReservationStatus
		source: Channel
		occasion: string | null
		feedback: { rating: number; comments: string; serviceTags: string[]; submittedAt: string } | null
	}>
}

export async function fetchGuests(q?: string): Promise<StaffGuest[]> {
	return apiFetch<StaffGuest[]>('/staff/guests', { query: q ? { q } : undefined })
}

export async function fetchGuest(id: string): Promise<StaffGuest> {
	return apiFetch<StaffGuest>(`/staff/guests/${id}`)
}

export interface AuditEvent {
	id: string
	at: string
	actor: string
	action: string
	entityType: string
	entityId: string
	changes: Record<string, { from: unknown; to: unknown }> | null
	note: string | null
}

export async function fetchAuditLog(venueId?: string): Promise<AuditEvent[]> {
	return apiFetch<AuditEvent[]>('/admin/audit-log', { query: venueId ? { venueId } : undefined })
}
export interface AdminAnalytics {
	venueId: string
	today: string
	timeZone: string
	settings: unknown
	guests: Array<{
		id: string
		fullName: string
		phone: string
		allergies: string[]
	}>
	feedback: Array<{
		id: string
		reservationId: string
		guestId: string
		rating: number
		comments: string
		serviceTags: string[]
		submittedAt: string
		reservation: {
			id: string
			bookingCode: string
			guestId: string
			date: string
			time: string
			partySize: number
			seatingAreaId: string
			source: string
			occasion?: string
			guest: { id: string; fullName: string; phone: string | null }
		}
	}>
	dashboard: {
		today: {
			date: string
			bookings: number
			expectedCovers: number
			arrivedCovers: number
			seatedCovers: number
			completedCovers: number
			remainingCovers: number
			noShows: number
			cancellations: number
			occupancyPercent: number
		}
		upcoming7: {
			startDate: string
			days: number
			daysBreakdown: Array<{ date: string; covers: number; bookings: number; fillPercent: number }>
			busiestSlot: { time: string; covers: number } | null
			totalCovers: number
		}
		upcoming30: {
			startDate: string
			days: number
			daysBreakdown: Array<{ date: string; covers: number; bookings: number; fillPercent: number }>
			busiestSlot: { time: string; covers: number } | null
			totalCovers: number
		}
		guestMix: {
			totalGuests: number
			firstTimers: number
			repeatGuests: number
			retentionShare: number
			occasionMix: Array<{ occasion: string; covers: number }>
			partySizeMix: Array<{ bucket: string; bookings: number }>
		}
		channel: {
			rows: Array<{ channel: string; bookings: number; covers: number; share: number }>
			totalBookings: number
			totalCovers: number
		}
		reliability: {
			totalRealised: number
			noShows: number
			cancellations: number
			noShowRate: number
			cancellationRate: number
			averageLeadTimeHours: number
			byDay: Array<{ date: string; noShowRate: number; cancellationRate: number }>
		}
		cues: Array<{
			kind: string
			message: string
			severity: 'warn' | 'danger'
			reservationId?: string
			guestId?: string
			date?: string
			time?: string
		}>
		filtered: Array<{
			id: string
			bookingCode: string
			guestId: string
			date: string
			time: string
			partySize: number
			seatingAreaId: string
			source: string
		status: ReservationStatus
			occasion?: string
		}>
	}
}

export async function fetchAdminAnalytics(filters: {
	from: string
	to: string
	status?: string
	source?: string
	seatingAreaId?: string
	occasion?: string
}): Promise<AdminAnalytics> {
	return apiFetch<AdminAnalytics>('/admin/analytics', { query: filters as Record<string, string> })
}

export interface VenueSettings {
	id: string
	name: string
	tagline: string
	intro: string
	address: string
	phone: string
	whatsapp: string
	email: string
	mapsUrl: string
	timeZone: string
	bookingIntervalMinutes: number
	partyMin: number
	partyMax: number
	diningMinutes: number
	leadTimeMinutes: number
	cutoffMinutes: number
	graceMinutes: number
	noShowTargetPercent: number
	overCapacityAlertPercent: number
	cancellationPolicy: string
	noticeEnabled: boolean
	noticeDate: string | null
	noticeText: string
	feedbackTitle?: string
	feedbackSubtitle?: string
	feedbackTags?: string[]
	feedbackMessageTemplate: string
}

export async function fetchVenue(id: string): Promise<VenueSettings> {
	return apiFetch<VenueSettings>(`/admin/venues/${id}`)
}

export async function updateVenue(
	id: string,
	body: Record<string, unknown>,
): Promise<VenueSettings> {
	return apiFetch<VenueSettings>(`/admin/venues/${id}`, { method: 'PATCH', body })
}

export interface OpeningHoursRow {
	weekday: number
	openMinute: number
	closeMinute: number
}

export async function fetchOpeningHours(id: string): Promise<OpeningHoursRow[]> {
	return apiFetch<OpeningHoursRow[]>(`/admin/venues/${id}/opening-hours`)
}

export async function saveOpeningHours(id: string, rows: OpeningHoursRow[]): Promise<OpeningHoursRow[]> {
	return apiFetch<OpeningHoursRow[]>(`/admin/venues/${id}/opening-hours`, { method: 'PUT', body: rows })
}

export interface ClosedDateRow {
	date: string
	reason: string | null
}

export async function fetchClosedDates(id: string): Promise<ClosedDateRow[]> {
	return apiFetch<ClosedDateRow[]>(`/admin/venues/${id}/closed-dates`)
}

export async function saveClosedDates(id: string, rows: ClosedDateRow[]): Promise<ClosedDateRow[]> {
	return apiFetch<ClosedDateRow[]>(`/admin/venues/${id}/closed-dates`, { method: 'PUT', body: rows })
}

export interface StaffUserRow {
	id: string
	name: string
	login: string
	role: string
	active: boolean
	venueId: string
}

export async function fetchUsers(venueId?: string): Promise<StaffUserRow[]> {
	return apiFetch<StaffUserRow[]>('/admin/users', { query: venueId ? { venueId } : undefined })
}

export async function saveUsers(rows: Array<{ userId: string; venueId: string; role: string; name?: string; login?: string; active?: boolean; password?: string }>): Promise<void> {
	await apiFetch('/admin/users', { method: 'PUT', body: rows })
}

export async function createUser(body: { venueId: string; name: string; login: string; password: string; role: string }): Promise<StaffUserRow> {
	return apiFetch<StaffUserRow>('/admin/users', { method: 'POST', body })
}

export async function removeUser(userId: string, venueId: string): Promise<void> {
	await apiFetch(`/admin/users/${userId}`, { method: 'DELETE', query: { venueId } })
}

export interface VenueSummary { id: string; slug: string; name: string }

export async function fetchVenues(): Promise<VenueSummary[]> {
	return apiFetch<VenueSummary[]>('/admin/venues')
}

export async function createVenue(body: { slug: string; name: string }): Promise<VenueSummary> {
	return apiFetch<VenueSummary>('/admin/venues', { method: 'POST', body })
}

export async function downloadExportCSV(venueId: string): Promise<string> {
	return apiFetch<string>(`/admin/venues/${venueId}/export.csv`, { method: 'GET' })
}

export async function login(body: { login: string; password: string }): Promise<{ user: StaffUser }> {
	return apiFetch<{ user: StaffUser }>('/staff/login', { method: 'POST', body })
}

export async function logout(): Promise<{ ok: boolean }> {
	return apiFetch<{ ok: boolean }>('/staff/logout', { method: 'POST' })
}

export async function fetchFloorPlan(venueId: string): Promise<AdminFloorPlan> {
	return apiFetch<AdminFloorPlan>(`/admin/venues/${venueId}/floor-plan`)
}

export async function saveFloorLayout(venueId: string, body: { areas: FloorPlanArea[]; tables: FloorTable[]; objects: FloorObject[] }): Promise<AdminFloorPlan> {
	return apiFetch<AdminFloorPlan>(`/admin/venues/${venueId}/floor-plan/layout`, { method: 'PUT', body })
}

export async function saveFloorImage(venueId: string, body: { image: string | null; width?: number; height?: number }): Promise<AdminFloorPlan> {
	return apiFetch<AdminFloorPlan>(`/admin/venues/${venueId}/floor-plan/image`, { method: 'PUT', body })
}

export async function exportDayCSV(venueId: string, date: string): Promise<Blob> {
	return apiFetch<Blob>(`/staff/venues/${venueId}/export.csv`, { query: { date }, responseType: 'blob' })
}
