<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { Role } from '../domain/types'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const error = ref<string | null>(null)

const next = computed(() => {
  const raw = route.query.next
  return typeof raw === 'string' ? raw : null
})

function loginAs(role: Role) {
  error.value = null
  try {
    auth.loginAs(role)
    const dest = next.value ?? (role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/host')
    router.push(dest)
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-16">
    <div class="card text-center">
      <div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gioi-moss text-white">
        <span class="font-display text-2xl font-bold">G</span>
      </div>
      <h1 class="mt-4 font-display text-3xl font-semibold text-gioi-moss">Sign in to GIOI</h1>
      <p class="mt-2 text-gioi-ink/70">Demo prototype — pick a role to enter the corresponding view. Real auth comes later.</p>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <button class="card hover:border-gioi-moss/60 text-left transition-colors" type="button" @click="loginAs('SUPER_ADMIN')">
          <p class="label">Super Admin</p>
          <p class="mt-1 font-display text-xl font-semibold text-gioi-moss">Full operational access</p>
          <p class="mt-1 text-sm text-gioi-ink/70">Reservations, settings, users, dashboard, audit log, exports.</p>
          <p class="mt-3 text-sm font-medium text-gioi-moss">Sign in as Made →</p>
        </button>
        <button class="card hover:border-gioi-moss/60 text-left transition-colors" type="button" @click="loginAs('HOST')">
          <p class="label">Host</p>
          <p class="mt-1 font-display text-xl font-semibold text-gioi-moss">Front-of-house</p>
          <p class="mt-1 text-sm text-gioi-ink/70">Today's bookings, guest search, status changes, walk-ins.</p>
          <p class="mt-3 text-sm font-medium text-gioi-moss">Sign in as Putu →</p>
        </button>
      </div>
      <div v-if="error" class="alert-danger mt-6">{{ error }}</div>
    </div>
  </div>
</template>