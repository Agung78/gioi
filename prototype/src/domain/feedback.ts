import type { Guest, Reservation, Settings } from './types'

export function feedbackMessage(settings: Settings, guest: Guest, feedbackUrl: string): string {
  const template = settings.feedbackMessageTemplate?.trim() || 'Hi {{guestName}}, thank you for dining at {{restaurantName}}. We would love your feedback: {{feedbackUrl}}'
  const message = template
    .replaceAll('{{guestName}}', guest.fullName)
    .replaceAll('{{restaurantName}}', settings.restaurant.name)
    .replaceAll('{{feedbackUrl}}', feedbackUrl)
  return message.includes(feedbackUrl) ? message : `${message}\n${feedbackUrl}`
}

export function feedbackWhatsAppUrl(settings: Settings, reservation: Reservation, guest: Guest, origin: string): string | null {
  const phone = guest.phone.replace(/\D/g, '')
  const feedbackUrl = `${origin}/feedback/${encodeURIComponent(reservation.bookingCode)}`
  if (reservation.status !== 'completed' || !phone) return null
  const message = feedbackMessage(settings, guest, feedbackUrl)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
