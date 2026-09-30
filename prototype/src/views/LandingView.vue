<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useDataStore } from '../stores/data'

const data = useDataStore()
const info = data.settings.restaurant
const hours = data.settings.openingHours
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const dayLabel = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-gioi-sand/60 bg-gradient-to-b from-gioi-cream via-gioi-sand/40 to-gioi-cream">
      <div class="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
        <div>
          <p class="chip mb-4 bg-gioi-sand text-gioi-moss">Direct reservations · No marketplace fees</p>
          <h1 class="font-display text-4xl font-semibold tracking-tight text-gioi-moss md:text-5xl">
            {{ info.heroEmoji }} {{ info.name }}
          </h1>
          <p class="mt-4 text-lg text-gioi-moss/80">{{ info.tagline }}</p>
          <p class="mt-4 leading-relaxed text-gioi-ink/80">{{ info.intro }}</p>
          <div class="mt-6 flex flex-wrap gap-3">
            <RouterLink to="/book" class="btn-primary text-base">Reserve a table →</RouterLink>
            <a :href="info.mapsUrl" target="_blank" rel="noopener" class="btn-secondary">Get directions</a>
          </div>
        </div>
        <div class="card relative overflow-hidden p-0">
          <div class="grid h-64 place-items-center bg-gradient-to-br from-gioi-sand via-gioi-cream to-gioi-sand/40">
            <div class="text-center">
              <div class="font-display text-7xl text-gioi-moss/70">{{ info.heroEmoji }}</div>
              <p class="mt-3 text-sm text-gioi-moss/70">Sunset view · garden kitchen</p>
            </div>
          </div>
          <div class="p-5">
            <p class="text-sm font-semibold uppercase tracking-wide text-gioi-moss/70">Tonight's kitchen</p>
            <p class="mt-1 text-sm text-gioi-ink/80">Slow-fire hearth, Balinese spice garden, daily catch from Jimbaran.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 py-12">
      <div class="grid gap-8 md:grid-cols-3">
        <div class="card">
          <p class="label">Address</p>
          <p class="text-base">{{ info.address }}</p>
          <a :href="info.mapsUrl" target="_blank" rel="noopener" class="mt-3 inline-block text-sm font-medium text-gioi-moss underline">Open in Maps →</a>
        </div>
        <div class="card">
          <p class="label">Hours</p>
          <ul class="space-y-1 text-sm">
            <li v-for="d in days" :key="d" class="flex justify-between gap-3">
              <span class="text-gioi-moss/70">{{ dayLabel[d] }}</span>
              <span>{{ hours[d].open }} – {{ hours[d].close }}</span>
            </li>
          </ul>
          <p v-if="data.settings.closedDates.length" class="mt-3 text-xs text-gioi-moss/60">
            Closed: {{ data.settings.closedDates.join(', ') }}
          </p>
        </div>
        <div class="card">
          <p class="label">Contact</p>
          <p class="text-sm">WhatsApp <a :href="`https://wa.me/${info.whatsapp.replace(/\D/g, '')}`" class="text-gioi-moss underline">{{ info.whatsapp }}</a></p>
          <p class="text-sm">Phone <a :href="`tel:${info.phone}`" class="text-gioi-moss underline">{{ info.phone }}</a></p>
          <p class="text-sm">Email <a :href="`mailto:${info.email}`" class="text-gioi-moss underline">{{ info.email }}</a></p>
        </div>
      </div>
    </section>

    <section class="bg-gioi-sand/30 py-12">
      <div class="mx-auto max-w-3xl px-4 text-center">
        <h2 class="font-display text-2xl font-semibold text-gioi-moss">Book directly, skip the marketplace</h2>
        <p class="mt-3 text-gioi-ink/80">Your reservation lives with us, not on a third-party platform. We'll remember your preferences, allergies, and favourite seat — visit after visit.</p>
        <RouterLink to="/book" class="btn-primary mt-6 inline-flex text-base">Reserve a table →</RouterLink>
      </div>
    </section>

    <section class="mx-auto max-w-3xl px-4 py-12 text-xs text-gioi-moss/60">
      <p class="font-semibold uppercase tracking-wide">Cancellation policy</p>
      <p class="mt-2">{{ data.settings.cancellationPolicy }}</p>
    </section>
  </div>
</template>