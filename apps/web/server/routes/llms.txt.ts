import { defineEventHandler, setHeader } from 'h3'
import { VENUE_SEO } from '../../utils/venueSeo'

// Generated from VENUE_SEO so a new venue shows up here, in the sitemap and on its page with one edit.
export default defineEventHandler((event) => {
	const { siteUrl, bookUrl: book } = useRuntimeConfig(event).public
	const bookUrl = book || siteUrl // empty in dev
	const venues = Object.entries(VENUE_SEO)
	const line = (f: (slug: string, v: (typeof venues)[0][1], name: string) => string[]) =>
		venues.flatMap(([slug, v]) => f(slug, v, v.title.split(' | ')[0])).join('\n')
	const body = `# GIOI Group

> GIOI Group runs restaurants with free online table reservations. This site is the group landing page; each venue has its own page at ${siteUrl}/<venue>, and bookings are made at ${bookUrl}/<venue>/book.

## Venues

${line((slug, v, name) => [`- [${name}](${siteUrl}/${slug}): ${v.description.split('. ')[0]}.`])}

## Menus

${line((slug, v, name) => (v.menus ?? []).map((m) => `- [${name}: ${m.label}](${siteUrl}${m.path})`)) || '- None published'}

## Booking

${line((slug, v, name) => [`- [Reserve a table at ${name}](${bookUrl}/${slug}/book)`])}

## Optional

- [Privacy policy](${siteUrl}/privacy)
`
	setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
	return body
})
