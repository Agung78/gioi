import { defineEventHandler, setHeader } from 'h3'
import { VENUE_SEO } from '../../utils/venueSeo'

export default defineEventHandler((event) => {
	const { siteUrl } = useRuntimeConfig(event).public
	const rootUrl = `  <url>
    <loc>${siteUrl}/</loc>
  </url>`
	const venueUrls = Object.keys(VENUE_SEO)
		.map(
			(slug) =>
			`  <url>
    <loc>${siteUrl}/${slug}</loc>
  </url>`
		)
		.join('\n')
	const privacyUrl = `  <url>
    <loc>${siteUrl}/privacy</loc>
  </url>`
	const urls = `${rootUrl}\n${venueUrls}\n${privacyUrl}`
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
	setHeader(event, 'content-type', 'application/xml')
	return xml
})
