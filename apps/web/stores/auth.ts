import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { StaffUser } from '@/composables/useApi'
import { fetchMe, login as apiLogin, logout as apiLogout } from '@/composables/useApi'

export const useAuthStore = defineStore('auth', () => {
	const user = ref<StaffUser | null>(null)
	const ready = ref(false)

	async function me() {
		const u = await fetchMe()
		user.value = u
		ready.value = true
		return u
	}

	const isSuperAdmin = computed(() => !!user.value?.isSuperAdmin)
	// venue admins manage their venue; super admins manage everything
	const isAdmin = computed(() => isSuperAdmin.value || Object.values(user.value?.venueRoles ?? {}).includes('admin'))
	/** First venue id where this user has the `admin` role (venue admin, not super admin). */
	const adminVenueId = computed(() => Object.entries(user.value?.venueRoles ?? {}).find(([, role]) => role === 'admin')?.[0] ?? null)
	// selectedVenueId: persisted per-client localStorage; super admin picks which venue Host/Dashboard/Settings target. Venues list itself is NOT stored—just the id.
	const selectedVenueId = ref<string | null>(null)
	if (import.meta.client) {
		try { selectedVenueId.value = localStorage.getItem('gioi.venueId') ?? null } catch { /* storage unavailable */ }
	}
	function setSelectedVenueId(id: string | null) {
		selectedVenueId.value = id
		if (import.meta.client) {
			try { id ? localStorage.setItem('gioi.venueId', id) : localStorage.removeItem('gioi.venueId') } catch { /* storage unavailable */ }
		}
	}

	async function login(body: { login: string; password: string }) {
		await apiLogin(body)
		return me() // /staff/me carries venueRoles, which the login response lacks
	}

	async function logout() {
		await apiLogout().catch(() => { /* ignore */ })
		user.value = null
		ready.value = true
	}

	return { user, ready, isSuperAdmin, isAdmin, adminVenueId, selectedVenueId, setSelectedVenueId, me, login, logout }
})
