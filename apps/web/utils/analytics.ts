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
  const pathname = String(cp.properties?.$pathname ?? '')
  const venue = venueOfPath(pathname, slugs)
  if (venue && cp.properties?.venue === undefined) cp.properties!.venue = venue
  if (cp.properties) maskBookingCodes(cp.properties)
  return cp
}

// PostHog repeats the URL in many keys ($session_entry_url, $initial_current_url, ...) and nests some under $set/$set_once: mask every string.
function maskBookingCodes(o: Record<string, unknown>): void {
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (typeof v === 'string') {
      o[k] = v
        .replace(/\/confirmation\/[^/?#]+/g, '/confirmation/:code')
        .replace(/\/feedback\/[^/?#]+/g, '/feedback/:code')
    } else if (v && typeof v === 'object' && !Array.isArray(v)) maskBookingCodes(v as Record<string, unknown>)
  }
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

// First-touch attribution of the current PostHog session, sent with the booking so the server event carries its source.
// Keys are PostHog's session-entry props; values are the body fields the API accepts.
const ATTRIBUTION_KEYS = {
  $session_entry_referring_domain: 'referringDomain',
  $session_entry_utm_source: 'utmSource',
  $session_entry_utm_medium: 'utmMedium',
  $session_entry_utm_campaign: 'utmCampaign',
  $session_entry_utm_content: 'utmContent',
  $session_entry_utm_term: 'utmTerm',
} as const

export type Attribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[keyof typeof ATTRIBUTION_KEYS], string>>

export function sessionAttribution(props: Record<string, unknown> | undefined): Attribution | undefined {
  const out: Attribution = {}
  for (const [from, to] of Object.entries(ATTRIBUTION_KEYS)) {
    const v = props?.[from]
    if (typeof v === 'string' && v) out[to as keyof Attribution] = v.slice(0, 200)
  }
  return Object.keys(out).length ? out : undefined
}
