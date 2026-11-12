<template>
  <div class="min-h-screen flex flex-col">
    <a
      href="#main"
      class="sr-only focus:not-sr-only fixed top-4 left-4 z-50 px-4 py-2 text-sm font-medium bg-surface text-ink rounded shadow ring-1 ring-line"
      >Skip to content</a
    >
    <header
      v-if="!isPublic"
      class="[view-transition-name:app-header] sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <NuxtLink :to="logoHref" class="flex shrink-0 items-center gap-2">
          <img src="/logo-group-128.webp" alt="GIOI Group" width="128" height="128" class="h-10 w-10 rounded-full object-cover" />
        </NuxtLink>
        <nav v-if="navLinks.length > 1" class="hidden gap-1 sm:flex" aria-label="Primary">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-muted transition hover:bg-line/50 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            active-class="bg-line/60 !text-ink"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
        <div class="flex min-w-0 items-center gap-2">
          <span v-if="auth.user" class="chip hidden whitespace-nowrap bg-line/60 text-ink md:inline-flex">{{ userLabel }}</span>
          <select v-if="auth.isSuperAdmin && venues.length" v-model="auth.selectedVenueId" class="field min-h-10 !w-auto min-w-0 max-w-[14rem] truncate !py-1.5 text-sm" :aria-label="'Select venue'">
            <option v-for="v in venues" :key="v.id" :value="v.id">{{ venueLabel(v) }}</option>
          </select>
          <button v-if="auth.user" class="btn-secondary min-h-10 shrink-0" type="button" @click="signOut">Sign out</button>
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

    <main id="main" class="flex-1">
      <NuxtPage />
    </main>
    <button
      type="button"
      :class="onBooking ? 'bottom-40 right-4 lg:bottom-6 lg:right-6' : 'bottom-6 right-6'"
      class="fixed z-50 grid h-12 w-12 place-items-center rounded-full bg-raised text-ink shadow-soft ring-1 ring-line transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggleTheme"
    >
      <component :is="isDark ? PhSun : PhMoon" :size="22" class="transition-transform duration-300 hover:rotate-12" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from '#app'
import { PhMoon, PhSun } from '@phosphor-icons/vue'
import { useAuthStore } from '@/stores/auth'
import { applyTheme, useTheme } from '@/composables/useTheme'
import { fetchVenues } from '@/composables/useApi'

const route = useRoute()
const auth = useAuthStore()
const { isDark, toggleTheme } = useTheme()
if (import.meta.client) applyTheme(isDark)

const venues = ref<{ id: string; slug: string; name: string }[]>([])
let venuesLoaded = false
async function loadVenues() {
	if (venuesLoaded) return
	venuesLoaded = true
	const list = await fetchVenues()
	venues.value = list
	if (!auth.selectedVenueId || !list.some((v) => v.id === auth.selectedVenueId)) {
		auth.setSelectedVenueId(list[0]?.id ?? null)
	}
}
watch(() => auth.isSuperAdmin, (isSuper) => { if (isSuper && !venuesLoaded) loadVenues() }, { immediate: true })

const onBooking = computed(() => route.path.endsWith('/book'))
const { siteUrl, bookUrl } = useRuntimeConfig().public
const logoHref = computed(() => {
  const v = route.params.venue
  return v ? (bookUrl ? `${siteUrl}/${v}` : `/${v}`) : '/'
})
async function signOut() {
  await auth.logout()
  await navigateTo('/login')
}

const isPublic = computed(() => route.meta?.public === true)
const navLinks = computed(() => {
  if (!auth.user) return []
  const links = [{ to: '/host', label: 'Host' }]
  if (auth.isAdmin) links.push({ to: '/admin', label: 'Dashboard' }, { to: '/admin/settings', label: 'Settings' })
  if (auth.adminVenueId && !auth.isSuperAdmin) links.push({ to: '/admin/floor-plan', label: 'Floor plan' }) // layout is the venue admin's job; super admin only uploads the drawing in Settings
  if (auth.isSuperAdmin) links.push({ to: '/admin/audit', label: 'Audit' })
  return links
})

// Staff pages set no title of their own, so the tab fell back to the URL.
const role = computed(() => (auth.isSuperAdmin ? 'Super Admin' : auth.isAdmin ? 'Admin' : 'Host'))
// A user named after their role ("Super Admin") would read "Super Admin · super admin".
const userLabel = computed(() => {
  const name = auth.user?.name?.trim() ?? ''
  return !name || name.toLowerCase() === role.value.toLowerCase() ? role.value : `${name} · ${role.value.toLowerCase()}`
})
// Slug only disambiguates venues that share a name.
const venueLabel = (v: { name: string; slug: string }) => (venues.value.filter((o) => o.name === v.name).length > 1 ? `${v.name} (${v.slug})` : v.name)
useHead({
  title: computed(() => {
    if (isPublic.value || !auth.user) return undefined
    const page = navLinks.value.find((l) => l.to === route.path)?.label
    return page && page !== role.value ? `${page} · ${role.value} | GIOI` : `${role.value} | GIOI`
  }),
})
</script>
