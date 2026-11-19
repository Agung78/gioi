export const STAFF_PREFIXES = ['/admin', '/host', '/login', '/guests']

export function isStaffPath(pathname: string): boolean {
  return STAFF_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function venueOfPath(pathname: string, slugs: readonly string[]): string | undefined {
  const segment = pathname.split('/')[1]
  if (!segment) return undefined
  return slugs.includes(segment) ? segment : undefined
}

export function gateEvent<T extends { properties?: Record<string, unknown> }>(
  cp: T | null,
  slugs: readonly string[],
): T | null {
  if (!cp || isStaffPath(String(cp.properties?.$pathname ?? ''))) return null
  const venue = venueOfPath(String(cp.properties?.$pathname ?? ''), slugs)
  if (venue && cp.properties?.venue === undefined) cp.properties!.venue = venue
  return cp
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

// Booking runs on another subdomain and PostHog keeps registered props per origin, so utm rides the link.
export function withUtm(url: string, search: string): string {
  const from = new URLSearchParams(search)
  const [base, query = ''] = url.split('?')
  const to = new URLSearchParams(query)
  for (const k of UTM_KEYS) if (from.get(k) && !to.has(k)) to.set(k, from.get(k)!)
  const q = to.toString()
  return q ? `${base}?${q}` : base
}
