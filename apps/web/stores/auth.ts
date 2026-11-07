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

	async function login(body: { login: string; password: string }) {
		await apiLogin(body)
		return me() // /staff/me carries venueRoles, which the login response lacks
	}

	async function logout() {
		await apiLogout().catch(() => { /* ignore */ })
		user.value = null
		ready.value = true
	}

	return { user, ready, isSuperAdmin, isAdmin, me, login, logout }
})
