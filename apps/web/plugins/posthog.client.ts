import { VENUE_SEO } from '@/utils/venueSeo'
import { gateEvent } from '@/utils/analytics'

export default defineNuxtPlugin({
	name: 'gioi-analytics',
	dependsOn: ['posthog-client'],
	setup() {
		const ph = useNuxtApp().$posthog?.()
		if (!ph) return
		ph.set_config({
			before_send: (cp) => gateEvent(cp, Object.keys(VENUE_SEO)),
		})
		const params = new URLSearchParams(location.search)
		const collected: Record<string, string> = {}
		for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
			const value = params.get(key)
			if (value) collected[key] = value
		}
		if (Object.keys(collected).length) {
			// ponytail: persists in cross-subdomain cookie until the next campaign visit overwrites it; the booking host URL carries no utm.
			ph.register(collected)
		}
	},
})
