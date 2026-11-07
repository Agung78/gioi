import { useAuthStore } from '@/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
	const auth = useAuthStore()
	// Store holds the session after login(); fall back to the server only on a cold load.
	// useFetch cached a 401 from before login, which bounced users straight back to /login.
	if (!auth.user) await auth.me()
	if (auth.user) return
	if (to.path === '/login') return
	return navigateTo('/login')
})
