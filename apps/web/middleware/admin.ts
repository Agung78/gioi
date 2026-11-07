import { useAuthStore } from '@/stores/auth'

// Runs after `auth`. Hosts are sent back to /host; the audit log is super-admin only (API enforces the same).
export default defineNuxtRouteMiddleware((to) => {
	const auth = useAuthStore()
	const allowed = to.path.startsWith('/admin/audit') ? auth.isSuperAdmin : auth.isAdmin
	if (!allowed) return navigateTo('/host')
})
