import { PostHog } from 'posthog-node'

let client: PostHog | null = null

function getClient(): PostHog | null {
	const key = process.env.POSTHOG_KEY
	if (!key) return null
	if (!client) {
		client = new PostHog(key, {
			host: 'https://us.i.posthog.com',
			flushAt: 1,
			flushInterval: 0,
		})
	}
	return client
}

export async function track(event: string, distinctId: string, properties: Record<string, unknown>): Promise<void> {
	const c = getClient()
	if (!c) return
	try {
		c.capture({ distinctId, event, properties })
		await c.flush()
	} catch {
		// analytics must never fail a request or booking
	}
}

// ponytail: flush-per-event is for serverless freeze; batch if moved to long-lived server.
