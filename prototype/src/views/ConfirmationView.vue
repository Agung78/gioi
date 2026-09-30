<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useDataStore } from '../stores/data'

const route = useRoute()
const data = useDataStore()

const code = computed(() => String(route.params.code))
const reservation = computed(() => data.reservations.find((r) => r.bookingCode === code.value) ?? null)
const area = computed(() => reservation.value
  ? data.settings.seatingAreas.find((a) => a.id === reservation.value?.seatingAreaId)
  : null)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-12">
    <div v-if="!reservation" class="card text-center">
      <p class="text-gioi-moss/80">We couldn't find that booking code.</p>
      <RouterLink to="/" class="btn-primary mt-4 inline-flex">Back to home</RouterLink>
    </div>
    <div v-else class="card text-center">
      <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gioi-moss text-white">
        <svg viewBox="0 0 24 24" fill="none" class="h-8 w-8" stroke="currentColor" stroke-width="2.5">
          <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h1 class="mt-4 font-display text-3xl font-semibold text-gioi-moss">Reservation confirmed</h1>
      <p class="mt-2 text-gioi-ink/70">We've held your table. A confirmation has been queued for {{ reservation.guestId }}.</p>

      <div class="mx-auto mt-6 grid max-w-md gap-3 rounded-md border border-gioi-sand bg-gioi-cream p-5 text-left">
        <div class="flex items-baseline justify-between">
          <span class="label !mb-0">Booking code</span>
          <span class="font-display text-lg font-bold text-gioi-moss">{{ reservation.bookingCode }}</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="label !mb-0">Date</span>
          <span class="font-medium">{{ new Date(reservation.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="label !mb-0">Time</span>
          <span class="font-medium">{{ reservation.time }}</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="label !mb-0">Party</span>
          <span class="font-medium">{{ reservation.partySize }} {{ reservation.partySize === 1 ? 'guest' : 'guests' }}</span>
        </div>
        <div v-if="area" class="flex items-baseline justify-between">
          <span class="label !mb-0">Seating</span>
          <span class="font-medium">{{ area.name }}</span>
        </div>
      </div>

      <p class="mt-6 text-sm text-gioi-ink/70">
        Need to change anything? Reply to your confirmation message or contact us on
        <a class="text-gioi-moss underline" :href="`https://wa.me/${data.settings.restaurant.whatsapp.replace(/\D/g, '')}`">{{ data.settings.restaurant.whatsapp }}</a>.
      </p>
      <RouterLink to="/" class="btn-secondary mt-6 inline-flex">Back to home</RouterLink>
    </div>
  </div>
</template>