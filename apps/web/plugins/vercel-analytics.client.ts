import { injectAnalytics } from '@vercel/analytics/nuxt/runtime'
import { isStaffPath } from '@/utils/analytics'

// Replaces the '@vercel/analytics/nuxt' module (it takes no options): same injection, plus dropping staff routes.
export default defineNuxtPlugin(() => {
	injectAnalytics({ beforeSend: (e) => (isStaffPath(new URL(e.url, location.origin).pathname) ? null : e) })
})
