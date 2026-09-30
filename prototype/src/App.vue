<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { PhMoon, PhSun } from '@phosphor-icons/vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useDataStore } from './stores/data'
import { useResetDemo } from './composables/useResetDemo'
import { applyTheme, useTheme } from './composables/useTheme'

const route = useRoute()
const auth = useAuthStore()
const data = useDataStore()
const { reset } = useResetDemo()

onMounted(() => {
  data.hydrate()
  auth.hydrate()
})

const { isDark, toggleTheme } = useTheme()
applyTheme(isDark)

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
    <header v-if="!isPublic" class="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2">
          <img src="/logo.jpg" alt="GIOI Ocean Gourmet" class="h-10 w-10 rounded-full object-cover" />
        </RouterLink>
        <nav class="hidden gap-1 sm:flex">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="btn-ghost min-h-12"
            active-class="bg-line/60"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
        <div class="flex items-center gap-2">
          <button class="btn-ghost min-h-12 px-3" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
            <component :is="isDark ? PhSun : PhMoon" :size="22" aria-hidden="true" />
          </button>
          <button class="btn-ghost hidden md:inline-flex" type="button" @click="reset" title="Wipe localStorage and reload demo data">
            Reset demo data
          </button>
          <span v-if="auth.user" class="chip hidden bg-line/60 text-ink md:inline-flex">{{ auth.user.name }} · {{ auth.user.role }}</span>
          <button v-if="auth.user" class="btn-secondary min-h-12" type="button" @click="auth.logout()">Sign out</button>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

  </div>
</template>