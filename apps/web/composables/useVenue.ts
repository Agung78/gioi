import type { Venue } from '@/types/venue'

export function useVenue() {
  const venue = useState<Venue | null>('venue', () => null)
  const { data, pending, error, refresh } = useFetch<Venue>(`/api/public/venues/${useRoute().params.venue}`, {
    server: true,
  })

  venue.value = data.value ?? null
  return { venue, pending, error, refresh }
}
