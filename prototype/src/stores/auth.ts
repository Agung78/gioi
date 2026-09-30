import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Role, User } from '../domain/types'
import { useDataStore } from './data'

const AUTH_KEY = 'gioi.auth.v1'

interface AuthSnapshot {
  userId: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const data = useDataStore()
  const userId = ref<string | null>(null)

  const user = computed<User | null>(() => (userId.value ? data.getUser(userId.value) ?? null : null))
  const role = computed<Role | null>(() => user.value?.role ?? null)
  const isAuthed = computed(() => user.value !== null)

  function hydrate() {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AuthSnapshot
        userId.value = parsed.userId
      }
    } catch {
      userId.value = null
    }
  }

  function loginAs(role: Role) {
    const candidate = data.users.find((u) => u.role === role && u.active)
    if (!candidate) throw new Error(`No active ${role} user`)
    userId.value = candidate.id
    const updated = { ...candidate, lastLoginAt: new Date().toISOString() }
    data.users = data.users.map((u) => (u.id === candidate.id ? updated : u))
  }

  function logout() {
    userId.value = null
  }

  watch(userId, (val) => {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ userId: val })) } catch { /* ignore */ }
  })

  return { userId, user, role, isAuthed, hydrate, loginAs, logout }
})