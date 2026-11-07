// book.* serves guest routes only; admin.* serves staff routes only. Other hosts (localhost, previews) serve both.
const STAFF = /^\/(login|host|guests|admin)(\/|$)/
const GUEST = /^\/[^/]+\/(book|confirmation|feedback)(\/|$)/

export default defineEventHandler((event) => {
	const host = getRequestHost(event, { xForwardedHost: true })
	const path = event.path.split('?')[0]
	if ((host.startsWith('book.') && STAFF.test(path)) || (host.startsWith('admin.') && GUEST.test(path))) {
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	}
})
