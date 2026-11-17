import { VENUE_SEO } from '@/utils/venueSeo'
import type { Venue } from '@/types/venue'

export async function useVenue() {
  const venue = useState<Venue | null>('venue', () => null)
  const slug = useRoute().params.venue
  // Unknown slug (bots scanning /wp-login.php etc.): 404 here, before the API call, so it never reaches the API/Neon.
  if (!Object.hasOwn(VENUE_SEO, slug as string)) throw createError({ statusCode: 404, statusMessage: 'Venue not found', fatal: true })
  // Prerender has no /api rewrite: on the server, call the API origin (runtimeConfig.public.apiBase) directly.
  const { apiBase } = useRuntimeConfig().public
  const url = import.meta.server && apiBase ? `${apiBase}/public/venues/${slug}` : `/api/public/venues/${slug}`
  const { data, pending, error, refresh } = await useFetch<Venue>(url, {
    key: `venue-${slug}`,
    server: true,
  })
  if (import.meta.server && import.meta.prerender && !data.value) throw new Error(`Prerender: venue ${slug} not loaded from ${url}. Is the API up and NUXT_PUBLIC_API_BASE correct?`)

  venue.value = data.value ?? null
  return { venue, pending, error, refresh }
}
