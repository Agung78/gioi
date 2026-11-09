import { useRuntimeConfig } from '#app'

// Venue landing page URL. The booking host (book.*) is noindex, so links back to the landing page must be absolute site-host URLs, not relative ones that resolve to book.*. Dev (bookUrl empty) stays relative.
export function useVenueHome(slug: string): string {
	const { siteUrl, bookUrl } = useRuntimeConfig().public
	return bookUrl ? `${siteUrl}/${slug}` : `/${slug}`
}
