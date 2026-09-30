<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useDataStore } from './stores/data'
import { useResetDemo } from './composables/useResetDemo'

const route = useRoute()
const auth = useAuthStore()
const data = useDataStore()
const { reset } = useResetDemo()

onMounted(() => {
  data.hydrate()
  auth.hydrate()
})

const isPublic = computed(() => route.meta?.public === true)
const navLinks = computed(() => {
  if (!auth.user) return []
  if (auth.user.role === 'SUPER_ADMIN') {
    return [
      { to: '/host', label: 'Host' },
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/settings', label: 'Settings' },
      { to: '/admin/audit', label: 'Audit' },
    ]
  }
  return [{ to: '/host', label: 'Host' }]
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header v-if="!isPublic" class="sticky top-0 z-30 border-b border-gioi-sand/60 bg-gioi-cream/85 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2">
          <span class="grid h-8 w-8 place-items-center rounded-full bg-gioi-moss font-display text-base font-bold text-white">G</span>
          <span class="font-display text-lg font-semibold tracking-tight">GIOI Bali</span>
        </RouterLink>
        <nav class="hidden gap-1 sm:flex">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="btn-ghost"
            active-class="bg-gioi-sand"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
        <div class="flex items-center gap-2">
          <button class="btn-ghost" type="button" @click="reset" title="Wipe localStorage and reload demo data">
            Reset demo data
          </button>
          <span v-if="auth.user" class="chip bg-gioi-sand text-gioi-moss">{{ auth.user.name }} · {{ auth.user.role }}</span>
          <button v-if="auth.user" class="btn-secondary" type="button" @click="auth.logout()">Sign out</button>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

    <footer v-if="isPublic" class="border-t border-gioi-sand/60 bg-gioi-cream/70 py-6 text-center text-xs text-gioi-moss/70">
      Demo prototype · data lives in your browser only
    </footer>
  </div>
</template>