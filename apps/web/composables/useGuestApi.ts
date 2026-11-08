import type { PublicReservation } from '@gioi/domain'
import type { CreateReservationBody, CreateReservationResponse, FeedbackBody, FeedbackResponse } from '@/types/venue'

export async function createReservation(slug: string, body: CreateReservationBody, distinctId?: string) {
	return $fetch<CreateReservationResponse>(`/api/public/venues/${slug}/reservations`, {
		method: 'POST',
		body,
		headers: distinctId ? { 'X-POSTHOG-DISTINCT-ID': distinctId } : undefined,
		credentials: 'include',
	})
}

export async function getReservation(code: string) {
	return $fetch<PublicReservation>(`/api/public/reservations/${code}`, {
		credentials: 'include',
	})
}

export async function submitFeedback(code: string, body: FeedbackBody) {
	return $fetch<FeedbackResponse>(`/api/public/reservations/${code}/feedback`, {
		method: 'POST',
		body,
		credentials: 'include',
	})
}
