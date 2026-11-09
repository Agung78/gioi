// Marketing channels a public link may claim via ?src=. Anything else is 'website'.
// Keep in sync with the enum in apps/api/src/routes/public/reservations.ts.
const SOURCES = ['instagram', 'google', 'whatsapp'] as const
export type BookingSource = 'website' | (typeof SOURCES)[number]

export function bookingSource(raw: unknown): BookingSource {
	return SOURCES.find((s) => s === raw) ?? 'website'
}
