import type { CreateReservationBody, CreateReservationResponse, ReservationPublic, FeedbackBody, FeedbackResponse } from '@/types/venue'

export async function createReservation(slug: string, body: CreateReservationBody) {
	return $fetch<CreateReservationResponse>(`/api/public/venues/${slug}/reservations`, {
		method: 'POST',
		body,
		credentials: 'include',
	})
}

export async function getReservation(code: string) {
	return $fetch<ReservationPublic>(`/api/public/reservations/${code}`, {
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
