// book.* serves the booking flow only: staff routes 404. Landing pages 301 to the site host via vercel.json
// (prerendered pages like /bali are served before this middleware runs).
// The site host (gioigroup.com, www.) serves landing pages only: booking routes 301 to book.*.
// Other hosts (localhost, *.vercel.app previews) serve everything.
const STAFF = /^\/(login|host|guests|admin)(\/|$)/i
const GUEST = /^\/[^/]+\/(book|confirmation|feedback)(\/|$)/

export default defineEventHandler((event) => {
	const host = getRequestHost(event, { xForwardedHost: true })
	const path = event.path.split('?')[0]
	const { siteUrl, bookUrl } = useRuntimeConfig(event).public
	const siteHost = new URL(siteUrl).host.replace(/^www\./, '')

	if (host.startsWith('book.')) {
		if (STAFF.test(path)) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	} else if (bookUrl && (host === siteHost || host === `www.${siteHost}`) && GUEST.test(path)) {
		return sendRedirect(event, `${bookUrl}${event.path}`, 301)
	}
})
