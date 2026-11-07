export default defineNuxtRouteMiddleware((to, from) => {
	const host = useRuntimeConfig().public.apiBase ?? ''
	const isBook = host.includes('book') || window.location.hostname.includes('book')

	const staffRoutes = ['/login', '/host', '/guests', '/admin']

	if (isBook && staffRoutes.some((r) => to.path.startsWith(r))) {
		return abortNavigation({ statusCode: 404 })
	}
})
