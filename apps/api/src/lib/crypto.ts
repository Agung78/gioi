import { createHash } from 'crypto'

export function sha256Hex(input: string): string {
	return createHash('sha256').update(input).digest('hex')
}

export function randomBookingCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(8))
	let code = ''
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
	for (const b of bytes) code += alphabet[b % alphabet.length]
	return `GIOI-${code}`
}
