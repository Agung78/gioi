<template>
  <div class="min-h-screen flex flex-col">
    <header
      v-if="!isPublic"
      class="[view-transition-name:app-header] sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img src="/logo.jpg" alt="GIOI Ocean Gourmet" class="h-10 w-10 rounded-full object-cover" />
        </NuxtLink>
        <nav class="hidden gap-1 sm:flex">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="btn-ghost min-h-12"
            active-class="bg-line/60"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
        <div class="flex items-center gap-2">
          <button
            class="btn-ghost min-h-12 px-3"
            type="button"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          >
            <component :is="isDark ? PhSun : PhMoon" :size="22" aria-hidden="true" />
          </button>
          <span v-if="auth.user" class="chip hidden bg-line/60 text-ink md:inline-flex">{{ auth.user.name }} · {{ auth.user.role }}</span>
          <button v-if="auth.user" class="btn-secondary min-h-12" type="button" @click="auth.logout()">Sign out</button>
        </div>
      </div>
      <nav v-if="navLinks.length > 1" class="mx-auto flex max-w-6xl gap-1 overflow-x-auto border-t border-line px-4 py-1.5 sm:hidden" aria-label="Primary">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-medium text-muted"
          active-class="bg-line/60 !text-ink"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </header>

    <main class="flex-1">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#app'
import { PhMoon, PhSun } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const auth = useAuthStore()
const { isDark, toggleTheme } = useTheme()

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
