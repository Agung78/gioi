export default defineNuxtRouteMiddleware(async (to) => {
	const { data: user } = await useFetch<{ id: string; name: string; login: string; role: string } | null>('/api/staff/me', {
		credentials: 'include',
	})
	if (user.value) return
	if (to.path === '/login') return
	return navigateTo('/login')
})
