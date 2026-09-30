<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { PhMapPin, PhClock, PhWhatsappLogo, PhPhone } from '@phosphor-icons/vue'
import { useDataStore } from '../stores/data'
import { addDays, todayISO } from '../domain/dates'

const data = useDataStore()
const router = useRouter()
const info = data.settings.restaurant
const hours = data.settings.openingHours
const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const dayLabel = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const wa = `https://wa.me/${info.whatsapp.replace(/\D/g, '')}`

const today = todayISO()
const qDate = ref(today)
const qParty = ref(2)
const max = data.settings.partySizeLimits.max
const min = data.settings.partySizeLimits.min

function quickBook() {
  router.push({ path: '/book', query: { date: qDate.value, party: String(qParty.value) } })
}
</script>

<template>
  <div>
    <header class="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <RouterLink to="/" class="font-display text-xl font-extrabold tracking-tight">GIOI <span class="hidden font-medium text-muted sm:inline">Ocean Gourmet</span></RouterLink>
        <nav class="flex items-center gap-2">
          <a href="#visit" class="btn-ghost hidden sm:inline-flex">Visit</a>
          <RouterLink to="/book" class="btn-primary">Book a table</RouterLink>
        </nav>
      </div>
    </header>

    <section class="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 pt-10 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:px-8 md:pt-16">
      <div class="rise order-2 md:order-1">
        <h1 class="text-4xl font-extrabold md:text-5xl lg:text-6xl">{{ info.tagline }}</h1>
        <p class="mt-5 max-w-[45ch] text-lg leading-relaxed text-muted">{{ info.intro }}</p>
        <form class="mt-8 flex flex-wrap items-end gap-3" @submit.prevent="quickBook">
          <div>
            <label class="label" for="q-date">Date</label>
            <input id="q-date" v-model="qDate" type="date" :min="today" :max="addDays(today, 90)" class="field w-44" />
          </div>
          <div>
            <label class="label" for="q-party">Guests</label>
            <select id="q-party" v-model.number="qParty" class="field w-28">
              <option v-for="n in max - min + 1" :key="n" :value="min + n - 1">{{ min + n - 1 }}</option>
            </select>
          </div>
          <button class="btn-primary min-h-12 px-7 text-base" type="submit">Book a table</button>
        </form>
      </div>
      <div class="rise order-1 md:order-2">
        <!-- placeholder until client photography lands: hero-beachfront-golden-hour 1600x2000 -->
        <div class="grid aspect-[16/10] place-items-center rounded-surface border border-line bg-line/40 text-sm text-muted md:aspect-[4/5]">
          hero-beachfront-golden-hour 1600x2000
        </div>
      </div>
    </section>

    <section id="visit" class="reveal border-t border-line">
      <div class="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:px-8 md:py-28">
        <div class="space-y-8">
          <h2 class="text-3xl font-extrabold md:text-4xl">On the beach at Discovery Mall</h2>
          <p class="flex gap-3 leading-relaxed"><PhMapPin :size="24" class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span>{{ info.address }}<br /><a :href="info.mapsUrl" target="_blank" rel="noopener" class="font-medium text-accent underline underline-offset-4">Get directions</a></span>
          </p>
          <div class="flex gap-3">
            <PhClock :size="24" class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <ul class="w-full max-w-xs space-y-1 text-sm">
              <li v-for="d in days" :key="d" class="flex justify-between gap-3">
                <span class="text-muted">{{ dayLabel[d] }}</span>
                <span>{{ hours[d].open }} - {{ hours[d].close }}</span>
              </li>
              <li v-if="data.settings.closedDates.length" class="pt-2 text-xs text-muted">Closed: {{ data.settings.closedDates.join(', ') }}</li>
            </ul>
          </div>
          <div class="flex flex-wrap gap-3">
            <a :href="wa" class="btn-secondary"><PhWhatsappLogo :size="20" aria-hidden="true" /> WhatsApp</a>
            <a :href="`tel:${info.phone}`" class="btn-secondary"><PhPhone :size="20" aria-hidden="true" /> {{ info.phone }}</a>
          </div>
        </div>
        <div class="flex flex-col justify-center rounded-surface border border-line bg-raised p-8 shadow-soft md:p-12">
          <h2 class="text-3xl font-extrabold">Save your table for sunset.</h2>
          <p class="mt-4 max-w-[45ch] leading-relaxed text-muted">Book direct. We keep your allergies and favourite spot on file for next time.</p>
          <RouterLink to="/book" class="btn-primary mt-8 min-h-12 self-start px-7 text-base">Book a table</RouterLink>
          <p class="mt-8 text-xs leading-relaxed text-muted">{{ data.settings.cancellationPolicy }}</p>
        </div>
      </div>
    </section>

    <footer class="border-t border-line py-6 text-center text-xs text-muted">
      Demo prototype. Data lives in your browser only. <RouterLink to="/login" class="underline underline-offset-4">Staff login</RouterLink>
    </footer>
  </div>
</template>
