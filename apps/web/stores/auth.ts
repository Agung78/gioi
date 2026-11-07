import { defineStore } from 'pinia'
import { ref } from 'vue'
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

	async function login(body: { login: string; password: string }) {
		const { user: u } = await apiLogin(body)
		user.value = u
		return u
	}

	async function logout() {
		await apiLogout().catch(() => { /* ignore */ })
		user.value = null
		ready.value = true
	}

	return { user, ready, me, login, logout }
})
