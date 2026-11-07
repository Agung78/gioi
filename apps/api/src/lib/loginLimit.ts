import { tooManyRequests } from './errors'

const MAX_FAILS = 10
const WINDOW_MS = 15 * 60 * 1000
const fails = new Map<string, { n: number; resetAt: number }>()

// ponytail: per-instance memory; serverless instances don't share it. Move to a DB/Redis counter if brute-force matters.
export function assertLoginAllowed(key: string): void {
	const e = fails.get(key)
	if (e && e.resetAt > Date.now() && e.n >= MAX_FAILS) throw tooManyRequests('too many attempts, try later')
}

export function recordLoginFailure(key: string): void {
	const now = Date.now()
	const e = fails.get(key)
	if (!e || e.resetAt <= now) fails.set(key, { n: 1, resetAt: now + WINDOW_MS })
	else e.n++
}

export function clearLoginFailures(key: string): void {
	fails.delete(key)
}
