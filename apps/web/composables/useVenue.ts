import type { Venue } from '@/types/venue'

export async function useVenue() {
  const venue = useState<Venue | null>('venue', () => null)
  const slug = useRoute().params.venue
  // Prerender has no /api rewrite: call the API origin directly on the server when NUXT_PUBLIC_API_BASE is set.
  const { apiBase } = useRuntimeConfig().public
  const url = import.meta.server && apiBase ? `${apiBase}/public/venues/${slug}` : `/api/public/venues/${slug}`
  const { data, pending, error, refresh } = await useFetch<Venue>(url, {
    key: `venue-${slug}`,
    server: true,
  })

  venue.value = data.value ?? null
  return { venue, pending, error, refresh }
}
