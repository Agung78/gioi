import type { Channel, ReservationStatus } from '@gioi/domain'

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
	allergies: string[]
	accessibility?: string | null
	time: string
	date: string
}

const API = '/api'

export function apiFetch<T = unknown>(
	input: RequestInfo | URL,
	init?: Parameters<typeof $fetch>[1],
) {
	return $fetch<T>(API + (String(input).startsWith('/') ? input : '/' + String(input)), {
		credentials: 'include',
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
}

export async function fetchDay(date?: string): Promise<DayView> {
	return apiFetch<DayView>('/staff/day', { query: date ? { date } : undefined })
}

export interface CreateWalkInBody {
	guestName: string
	phone: string
	email?: string
	date: string
	time: string
	partySize: number
	seatingAreaId?: string
	occasion?: string
	guestNotes?: string
	internalNotes?: string
	source: Channel
	venueId?: string
}

export async function createWalkIn(body: CreateWalkInBody): Promise<{ bookingCode: string; reservationId: string }> {
	return apiFetch('/staff/reservations', { method: 'POST', body })
}

export interface UpdateReservationBody {
	partySize?: number
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

export interface AdminDashboard {
	venueId: string
	date: string
	bookings: number
	expectedCovers: number
	arrivedCovers: number
	seatedCovers: number
	completedCovers: number
	noShows: number
	cancellations: number
	byStatus: Record<string, number>
}

export async function fetchAdminDashboard(venueId?: string, date?: string): Promise<AdminDashboard> {
	return apiFetch<AdminDashboard>('/admin/dashboard', { query: { ...(venueId ? { venueId } : {}), ...(date ? { date } : {}) } })
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
	noShowTargetPercent: number
	overCapacityAlertPercent: number
	cancellationPolicy: string
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

export interface SeatingAreaRow {
	id?: string
	name: string
	capacity: number
	bookable: boolean
	minParty?: number | null
	maxParty?: number | null
}

export async function fetchSeatingAreas(id: string): Promise<SeatingAreaRow[]> {
	return apiFetch<SeatingAreaRow[]>(`/admin/venues/${id}/seating-areas`)
}

export async function saveSeatingAreas(id: string, rows: SeatingAreaRow[]): Promise<SeatingAreaRow[]> {
	return apiFetch<SeatingAreaRow[]>(`/admin/venues/${id}/seating-areas`, { method: 'PUT', body: rows })
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

export async function saveUsers(rows: Array<{ userId: string; venueId: string; role: string }>): Promise<void> {
	await apiFetch('/admin/users', { method: 'PUT', body: rows })
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
