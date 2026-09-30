<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '../stores/data'
import { useReservationsStore } from '../stores/reservations'
import { getDayAvailability, generateIntervals, hoursFor, isOpenOn, checkAvailability } from '../domain/availability'
import { addDays, todayISO } from '../domain/dates'
import AvailabilityGrid from '../components/AvailabilityGrid.vue'

const data = useDataStore()
const reservations = useReservationsStore()
const router = useRouter()
const route = useRoute()

const today = todayISO()
const date = ref<string>(typeof route.query.date === 'string' ? route.query.date : today)
const partySize = ref<number>(Number(route.query.party ?? 2))
const time = ref<string | null>(typeof route.query.time === 'string' ? route.query.time : null)
const seatingAreaId = ref<string | null>(null)

const fullName = ref('')
const phone = ref('')
const email = ref('')
const country = ref('')
const occasion = ref('')
const guestNotes = ref('')
const accessibility = ref('')
const allergiesText = ref('')
const marketingConsent = ref(false)
const acceptedPolicy = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)

const days = computed(() => {
  return Array.from({ length: 14 }, (_, i) => {
    const iso = addDays(today, i)
    const hours = hoursFor(data.settings, iso)
    const isClosed = !isOpenOn(data.settings, iso)
    return { iso, isClosed, hours }
  })
})

const slotGrid = computed(() => {
  if (isOpenOn(data.settings, date.value)) {
    return getDayAvailability(data.settings, data.reservations, date.value, partySize.value)
  }
  const h = hoursFor(data.settings, date.value)
  const fallback = h ?? { open: '00:00', close: '00:00' }
  return generateIntervals(fallback.open, fallback.close, data.settings.bookingIntervalMinutes)
    .map((t) => ({ time: t, open: false, reason: 'closed' as const }))
})

watch(partySize, () => { time.value = null })

const draft = computed(() => ({
  date: date.value,
  time: time.value ?? '',
  partySize: partySize.value,
  seatingAreaId: seatingAreaId.value ?? undefined,
}))

const checkResult = computed(() => {
  if (!time.value) return null
  return checkAvailability(data.settings, data.reservations, draft.value)
})

const canSubmit = computed(() => {
  if (!time.value) return false
  if (!acceptedPolicy.value) return false
  if (!fullName.value.trim() || !phone.value.trim()) return false
  const r = checkResult.value
  return r?.ok === true
})

async function submit() {
  error.value = null
  if (!time.value) return
  const r = checkResult.value
  if (!r?.ok) {
    error.value = 'This slot is no longer available. Please pick another time.'
    return
  }
  submitting.value = true
  try {
    const allergies = allergiesText.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const guestNotesText = [guestNotes.value.trim(), accessibility.value.trim() && `Accessibility: ${accessibility.value.trim()}`]
      .filter(Boolean)
      .join('\n')
    const reservation = reservations.create(
      {
        guest: {
          fullName: fullName.value.trim(),
          phone: phone.value.trim(),
          email: email.value.trim() || undefined,
          country: country.value.trim() || undefined,
          allergies,
          accessibility: accessibility.value.trim() || undefined,
          marketingConsent: marketingConsent.value,
        },
        date: date.value,
        time: time.value,
        partySize: partySize.value,
        seatingAreaId: r.areaId ?? seatingAreaId.value ?? data.settings.seatingAreas[0]?.id ?? 'main',
        occasion: occasion.value.trim() || undefined,
        guestNotes: guestNotesText || undefined,
        source: 'website',
      },
      'guest',
      'Guest',
    )
    router.push({ name: 'confirmation', params: { code: reservation.bookingCode } })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    submitting.value = false
  }
}

const partyOptions = computed(() => {
  const lo = data.settings.partySizeLimits.min
  const hi = data.settings.partySizeLimits.max
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <p class="mb-2 text-sm"><RouterLink to="/" class="text-gioi-moss underline">← Back to overview</RouterLink></p>
    <h1 class="font-display text-3xl font-semibold text-gioi-moss">Reserve a table</h1>
    <p class="mt-2 text-gioi-ink/70">Pick a date, time, and party size. We'll lock your seat and remember your preferences for next time.</p>

    <form class="card mt-6 space-y-6" @submit.prevent="submit">
      <section class="space-y-4">
        <h2 class="font-display text-xl font-semibold text-gioi-moss">1. When</h2>
        <div>
          <label class="label">Date</label>
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
            <button
              v-for="d in days"
              :key="d.iso"
              type="button"
              class="rounded-md border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gioi-moss/40"
              :class="[
                date === d.iso
                  ? 'border-gioi-moss bg-gioi-moss text-white'
                  : d.isClosed
                      ? 'border-gioi-sand/40 bg-gioi-sand/30 text-gioi-moss/40 line-through'
                      : 'border-gioi-sand bg-white hover:border-gioi-moss/60',
              ]"
              :disabled="d.isClosed"
              @click="date = d.iso; time = null"
            >
              <span class="block text-xs uppercase tracking-wide">{{ new Date(d.iso).toLocaleDateString(undefined, { weekday: 'short' }) }}</span>
              <span class="block font-semibold">{{ new Date(d.iso).getDate() }}</span>
              <span class="block text-[10px]">{{ new Date(d.iso).toLocaleDateString(undefined, { month: 'short' }) }}</span>
            </button>
          </div>
        </div>
        <div>
          <label class="label">Party size</label>
          <select v-model.number="partySize" class="field w-32">
            <option v-for="n in partyOptions" :key="n" :value="n">{{ n }} {{ n === 1 ? 'guest' : 'guests' }}</option>
          </select>
        </div>
        <div>
          <label class="label">Available times</label>
          <AvailabilityGrid v-model="time" :slots="slotGrid" :party-size="partySize" />
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="font-display text-xl font-semibold text-gioi-moss">2. Who</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="fullName">Full name *</label>
            <input id="fullName" v-model="fullName" required class="field" placeholder="Wayan Sari" />
          </div>
          <div>
            <label class="label" for="phone">WhatsApp / phone *</label>
            <input id="phone" v-model="phone" required class="field" placeholder="+62 812 3456 7890" />
          </div>
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" v-model="email" type="email" class="field" placeholder="you@example.com" />
          </div>
          <div>
            <label class="label" for="country">Country / city</label>
            <input id="country" v-model="country" class="field" placeholder="Bali" />
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="font-display text-xl font-semibold text-gioi-moss">3. The occasion</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="occasion">Occasion</label>
            <select id="occasion" v-model="occasion" class="field">
              <option value="">No special occasion</option>
              <option>Birthday</option>
              <option>Anniversary</option>
              <option>Date night</option>
              <option>Business dinner</option>
              <option>Friends catching up</option>
              <option>Celebration</option>
            </select>
          </div>
          <div>
            <label class="label" for="accessibility">Accessibility needs</label>
            <input id="accessibility" v-model="accessibility" class="field" placeholder="Wheelchair access, ground floor only…" />
          </div>
          <div class="sm:col-span-2">
            <label class="label" for="allergies">Allergies or dietary restrictions</label>
            <input id="allergies" v-model="allergiesText" class="field" placeholder="Peanut allergy, vegetarian…" />
            <p class="mt-1 text-xs text-gioi-moss/60">Comma-separated. Visible to our team only — never shared publicly.</p>
          </div>
          <div class="sm:col-span-2">
            <label class="label" for="guestNotes">Special requests</label>
            <textarea id="guestNotes" v-model="guestNotes" rows="2" class="field" placeholder="Window seat if possible…" />
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="font-display text-xl font-semibold text-gioi-moss">4. Confirm</h2>
        <p class="rounded-md border border-gioi-sand bg-gioi-cream p-3 text-sm text-gioi-ink/80">
          {{ data.settings.cancellationPolicy }}
        </p>
        <label class="flex items-start gap-3 text-sm">
          <input v-model="acceptedPolicy" type="checkbox" class="mt-1" />
          <span>I understand the cancellation policy.</span>
        </label>
        <label class="flex items-start gap-3 text-sm">
          <input v-model="marketingConsent" type="checkbox" class="mt-1" />
          <span>Send me occasional updates about seasonal menus and events. (Optional, separate from my reservation.)</span>
        </label>
        <div v-if="error" class="alert-danger">{{ error }}</div>
        <button class="btn-primary w-full justify-center text-base" :disabled="!canSubmit || submitting" type="submit">
          {{ submitting ? 'Confirming…' : 'Confirm reservation' }}
        </button>
      </section>
    </form>
  </div>
</template>