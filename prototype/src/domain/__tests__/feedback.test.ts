import { describe, expect, it } from 'vitest'
import { feedbackMessage, feedbackWhatsAppUrl } from '../feedback'
import type { Guest, Reservation, Settings } from '../types'

const settings = { restaurant: { name: 'GIOI' }, feedbackMessageTemplate: 'Hi {{guestName}} from {{restaurantName}}: {{feedbackUrl}}' } as Settings
const guest = { id: 'g1', fullName: 'Ayu', phone: '+62 811-22', allergies: [], marketingConsent: false, createdAt: '', updatedAt: '' } as Guest
const reservation = { id: 'r1', status: 'completed' } as Reservation

describe('feedback WhatsApp helper', () => {
  it('renders the configured message and URL-encodes it', () => {
    expect(feedbackMessage(settings, guest, 'https://app.test/feedback/A')).toBe('Hi Ayu from GIOI: https://app.test/feedback/A')
    expect(feedbackWhatsAppUrl(settings, reservation, guest, 'https://app.test')).toContain('https://wa.me/6281122?text=')
  })

  it('only builds links for completed reservations', () => {
    expect(feedbackWhatsAppUrl(settings, { ...reservation, status: 'confirmed' }, guest, 'https://app.test')).toBeNull()
  })
})
