<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from '#app'
import { PhCheckCircle, PhCopy, PhCalendarPlus, PhMapPin, PhWhatsappLogo } from '@phosphor-icons/vue'
import StatusChip from '@/components/StatusChip.vue'
import { useVenue } from '@/composables/useVenue'
import type { PublicReservation } from '@gioi/domain'

const route = useRoute()
const venueSlug = String(route.params.venue)
const { venue: info } = await useVenue()
const code = computed(() => String(route.params.code))

const { data: reservation, pending, error } = await useFetch<PublicReservation>(`/api/public/reservations/${code.value}`, {
  server: true,
})

const copied = ref(false)

const dateLabel = computed(() => reservation.value
  ? new Date(reservation.value.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })
  : '')

async function copy() {
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch { /* clipboard unavailable, code stays visible */ }
}

// ponytail: assumes 90 min stay; TZID without VTIMEZONE (Google/Apple/Outlook resolve it); add duration setting if needed
const icsHref = computed(() => {
  const r = reservation.value
  if (!r) return ''
  const start = `${r.date.replace(/-/g, '')}T${r.time.replace(':', '')}00`
  const [h, m] = r.time.split(':').map(Number)
  const end = `${r.date.replace(/-/g, '')}T${String(Math.floor((h * 60 + m + 90) / 60) % 24).padStart(2, '0')}${String((m + 30) % 60).padStart(2, '0')}00`
  const tz = info.value?.timeZone ?? 'Asia/Makassar'
  const stamp = `${start}Z` // deterministic (SSR-safe); clients ignore DTSTAMP value
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GIOI//booking//EN', 'BEGIN:VEVENT', `UID:${r.bookingCode}@gioi`, `DTSTAMP:${stamp}`, `DTSTART;TZID=${tz}:${start}`, `DTEND;TZID=${tz}:${end}`,
    `SUMMARY:${info.value?.name ?? 'GIOI'}`, `LOCATION:${info.value?.address ?? ''}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
})
</script>

<template>
  <div v-if="pending" class="mx-auto max-w-2xl px-4 py-12 text-center">
    <p class="text-muted">Loading…</p>
  </div>
  <div v-else-if="error || !reservation" class="mx-auto max-w-2xl px-4 py-12">
    <div class="card text-center">
      <p class="text-muted">We couldn't find that booking code.</p>
      <NuxtLink :to="`/${venueSlug}`" class="btn-primary mt-4">Back to home</NuxtLink>
    </div>
  </div>
  <div v-else class="mx-auto max-w-2xl px-4 py-12 md:py-16">
    <div class="rise">
      <div class="flex items-center gap-3">
        <PhCheckCircle :size="40" weight="fill" class="text-accent" aria-hidden="true" />
        <h1 class="text-3xl font-extrabold md:text-4xl">See you soon.</h1>
      </div>
      <p class="mt-3 text-muted">We've held your table. Show this code when you arrive.</p>

      <div class="card mt-8 space-y-6">
        <div class="flex items-center justify-between gap-3">
          <p class="font-display text-4xl font-extrabold tracking-wide">{{ reservation.bookingCode }}</p>
          <button type="button" class="btn-secondary" @click="copy"><PhCopy :size="20" aria-hidden="true" /> {{ copied ? 'Copied' : 'Copy' }}</button>
        </div>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div><dt class="text-muted">Date</dt><dd class="text-base font-semibold">{{ dateLabel }}</dd></div>
          <div><dt class="text-muted">Time</dt><dd class="text-base font-semibold">{{ reservation.time }}</dd></div>
          <div><dt class="text-muted">Guests</dt><dd class="text-base font-semibold">{{ reservation.partySize }}</dd></div>
          <div><dt class="text-muted">Seating</dt><dd class="text-base font-semibold">{{ reservation.seatingArea }}</dd></div>
        </dl>
        <StatusChip :status="reservation.status" />
      </div>

      <div class="mt-6 flex flex-wrap gap-3">
        <a :href="icsHref" :download="`gioi-${reservation.bookingCode}.ics`" class="btn-primary"><PhCalendarPlus :size="20" aria-hidden="true" /> Add to calendar</a>
        <a :href="info?.mapsUrl" target="_blank" rel="noopener" class="btn-secondary"><PhMapPin :size="20" aria-hidden="true" /> Get directions</a>
        <a :href="`https://wa.me/${info?.whatsapp.replace(/\D/g, '')}`" class="btn-secondary"><PhWhatsappLogo :size="20" aria-hidden="true" /> Message us</a>
      </div>
      <NuxtLink :to="`/${venueSlug}`" class="mt-8 inline-block text-sm font-medium text-accent underline underline-offset-4">Back to home</NuxtLink>
    </div>
  </div>
</template>
