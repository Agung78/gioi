import { defineEventHandler, setHeader } from 'h3'
import { VENUE_SEO } from '../../utils/venueSeo'
import { VENUE_MENU } from '../../utils/venueMenu'

export default defineEventHandler((event) => {
	const { siteUrl } = useRuntimeConfig(event).public
	const rootUrl = `  <url>
    <loc>${siteUrl}/</loc>
  </url>`
	// A venue's /menu page is listed only when it has menu data.
	const venueUrls = Object.keys(VENUE_SEO)
		.flatMap((slug) => (VENUE_MENU[slug] ? [slug, `${slug}/menu`] : [slug]))
		.map(
			(slug) =>
			`  <url>
    <loc>${siteUrl}/${slug}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
  </url>`
		)
		.join('\n')
	// /privacy is noindex, so it stays out of the sitemap.
	const urls = `${rootUrl}\n${venueUrls}`
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
	setHeader(event, 'content-type', 'application/xml')
	return xml
})
