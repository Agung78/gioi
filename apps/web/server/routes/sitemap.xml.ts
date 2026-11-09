import { defineEventHandler, setHeader } from 'h3'
import { VENUE_SEO } from '../../utils/venueSeo'

const lastmod = new Date().toISOString().slice(0, 10)

export default defineEventHandler((event) => {
	const { siteUrl } = useRuntimeConfig(event).public
	const rootUrl = `  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`
	const venueUrls = Object.keys(VENUE_SEO)
		.map(
			(slug) =>
			`  <url>
    <loc>${siteUrl}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`
		)
		.join('\n')
	const urls = `${rootUrl}\n${venueUrls}`
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
	setHeader(event, 'content-type', 'application/xml')
	return xml
})
