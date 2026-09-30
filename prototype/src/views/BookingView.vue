<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '../stores/data'
import { useReservationsStore } from '../stores/reservations'
import { getDayAvailability, generateIntervals, hoursFor, isOpenOn, checkAvailability } from '../domain/availability'
import { addDays, todayISO } from '../domain/dates'
import DatePicker from '../components/DatePicker.vue'
import { PhCaretDown } from '@phosphor-icons/vue'
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
const dietary = ref<string[]>([])
const showDetails = ref(false)
const DIET = ['Vegetarian', 'Vegan', 'Halal', 'Gluten-free', 'Nut allergy', 'Shellfish allergy']
const OCCASIONS = ['Birthday', 'Anniversary', 'Business dinner', 'Date night', 'Celebration']
const bookableAreas = computed(() => data.settings.seatingAreas.filter((a) => a.bookable))
function toggleDiet(d: string) {
  dietary.value = dietary.value.includes(d) ? dietary.value.filter((x) => x !== d) : [...dietary.value, d]
}
const summary = computed(() => {
  const d = new Date(date.value + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  return `${d} · ${time.value ?? 'pick a time'} · ${partySize.value} ${partySize.value === 1 ? 'guest' : 'guests'}`
})
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
    error.value = 'That time just filled up. Pick another slot above.'
    time.value = null
    document.getElementById('when')?.scrollIntoView({ behavior: 'smooth' })
    return
  }
  submitting.value = true
  try {
    const allergies = [...dietary.value, ...allergiesText.value.split(',').map((s) => s.trim()).filter(Boolean)]
    const guestNotesText = guestNotes.value.trim()
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
  <div class="mx-auto max-w-5xl px-4 pb-32 pt-8 md:px-8 lg:pb-16">
    <RouterLink to="/" class="text-sm font-medium text-accent underline underline-offset-4">Back to GIOI</RouterLink>
    <h1 class="mt-3 text-3xl font-extrabold md:text-4xl">Book a table</h1>

    <div class="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <form id="book-form" class="min-w-0 space-y-10" @submit.prevent="submit">
        <section id="when" class="space-y-5">
          <h2 class="text-xl font-bold">1. When</h2>
          <div>
            <span class="label">Date</span>
            <div class="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
              <button v-for="d in days" :key="d.iso" type="button"
                class="pill min-h-16 shrink-0 snap-start flex-col px-4"
                :class="[date === d.iso ? 'pill-on' : '', d.isClosed ? 'cursor-not-allowed opacity-40' : 'hover:border-accent']"
                :aria-disabled="d.isClosed" :disabled="d.isClosed" :aria-pressed="date === d.iso"
                @click="date = d.iso; time = null">
                <span class="text-xs">{{ new Date(d.iso + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short'
                  }) }}</span>
                <span class="text-lg font-bold leading-tight">{{ new Date(d.iso + 'T00:00:00').getDate() }}</span>
              </button>
            </div>
            <label class="mt-2 inline-flex items-center gap-2 text-sm text-muted">
              More dates
              <DatePicker :model-value="date" :min="today" :closed="data.settings.closedDates" class="py-1.5 text-sm"
                @update:model-value="date = $event; time = null" />
            </label>
          </div>
          <div>
            <span class="label" id="guests-label">Guests</span>
            <div class="inline-flex items-center gap-4" role="group" aria-labelledby="guests-label">
              <button type="button" class="pill h-12 w-12 px-0 text-xl" aria-label="Fewer guests"
                :disabled="partySize <= partyOptions[0]" @click="partySize--">-</button>
              <span class="w-8 text-center text-xl font-bold" aria-live="polite">{{ partySize }}</span>
              <button type="button" class="pill h-12 w-12 px-0 text-xl" aria-label="More guests"
                :disabled="partySize >= partyOptions[partyOptions.length - 1]" @click="partySize++">+</button>
            </div>
            <p v-if="partySize >= partyOptions[partyOptions.length - 1]" class="mt-2 text-sm text-muted">
              Groups over {{ partySize }}? <a class="font-medium text-accent underline underline-offset-4"
                :href="`https://wa.me/${data.settings.restaurant.whatsapp.replace(/\D/g, '')}`">Message us on
                WhatsApp</a>.
            </p>
          </div>
          <div v-if="bookableAreas.length > 1">
            <span class="label">Seating</span>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="pill" :class="seatingAreaId === null ? 'pill-on' : ''"
                :aria-pressed="seatingAreaId === null" @click="seatingAreaId = null">Anywhere</button>
              <button v-for="a in bookableAreas" :key="a.id" type="button" class="pill"
                :class="seatingAreaId === a.id ? 'pill-on' : ''" :aria-pressed="seatingAreaId === a.id"
                @click="seatingAreaId = a.id">{{ a.name }}</button>
            </div>
          </div>
          <div>
            <span class="label">Time</span>
            <AvailabilityGrid v-model="time" :slots="slotGrid" :party-size="partySize" />
          </div>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-bold">2. Who</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="fullName">Full name</label>
              <input id="fullName" v-model="fullName" required autocomplete="name" class="field"
                placeholder="Wayan Sari" />
            </div>
            <div>
              <label class="label" for="phone">WhatsApp / phone</label>
              <input id="phone" v-model="phone" required type="tel" autocomplete="tel" class="field"
                placeholder="+62 812 3456 7890" />
            </div>
            <div>
              <label class="label" for="email">Email (optional)</label>
              <input id="email" v-model="email" type="email" autocomplete="email" class="field"
                placeholder="you@example.com" />
            </div>
            <div>
              <label class="label" for="country">Country / city (optional)</label>
              <input id="country" v-model="country" autocomplete="country-name" class="field"
                placeholder="Perth, Australia" />
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <button type="button" class="flex w-full items-center justify-between text-left" :aria-expanded="showDetails"
            @click="showDetails = !showDetails">
            <h2 class="text-xl font-bold">3. Details <span class="text-base font-normal text-muted">(optional)</span>
            </h2>
            <PhCaretDown :size="20" class="transition-transform" :class="showDetails ? 'rotate-180' : ''"
              aria-hidden="true" />
          </button>
          <div v-show="showDetails" class="space-y-5">
            <div>
              <span class="label">Occasion</span>
              <div class="flex flex-wrap gap-2">
                <button v-for="o in OCCASIONS" :key="o" type="button" class="pill"
                  :class="occasion === o ? 'pill-on' : ''" :aria-pressed="occasion === o"
                  @click="occasion = occasion === o ? '' : o">{{ o }}</button>
              </div>
            </div>
            <div>
              <span class="label">Dietary and allergies</span>
              <div class="flex flex-wrap gap-2">
                <button v-for="d in DIET" :key="d" type="button" class="pill"
                  :class="[dietary.includes(d) ? 'pill-on' : '', d === 'Shellfish allergy' && !dietary.includes(d) ? 'border-danger/60 text-danger' : '']"
                  :aria-pressed="dietary.includes(d)" @click="toggleDiet(d)">{{ d }}</button>
              </div>
              <input id="allergies" v-model="allergiesText" aria-label="Other dietary needs" class="field mt-3"
                placeholder="Anything else, comma-separated" />
              <p class="mt-1.5 text-sm text-muted">Seen by our kitchen team only.</p>
            </div>
            <div>
              <label class="label" for="accessibility">Accessibility needs</label>
              <input id="accessibility" v-model="accessibility" class="field"
                placeholder="Wheelchair access, ground floor only" />
            </div>
            <div>
              <label class="label" for="guestNotes">Special requests</label>
              <textarea id="guestNotes" v-model="guestNotes" rows="3" maxlength="300" class="field"
                placeholder="Beachfront table if possible" />
              <p class="mt-1 text-right text-xs text-muted">{{ guestNotes.length }}/300</p>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <p class="text-sm leading-relaxed text-muted">{{ data.settings.cancellationPolicy }}</p>
          <label class="flex items-start gap-3 text-sm">
            <input v-model="acceptedPolicy" type="checkbox" class="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
            <span>I understand the cancellation policy.</span>
          </label>
          <label class="flex items-start gap-3 text-sm">
            <input v-model="marketingConsent" type="checkbox" class="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
            <span>Send me occasional news and events. (Optional)</span>
          </label>
          <div v-if="error" class="alert-danger" role="alert">{{ error }}</div>
          <button class="btn-primary hidden min-h-14 w-full text-base lg:inline-flex"
            :disabled="!canSubmit || submitting" type="submit">
            {{ submitting ? 'Confirming...' : 'Confirm booking' }}
          </button>
        </section>
      </form>

      <aside class="hidden lg:block">
        <div class="card sticky top-24">
          <p class="label text-muted">Your booking</p>
          <p class="text-lg font-bold">{{ summary }}</p>
          <p v-if="seatingAreaId" class="mt-1 text-sm text-muted">{{bookableAreas.find((a) => a.id ===
            seatingAreaId)?.name }}</p>
        </div>
      </aside>
    </div>

    <div class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 p-4 backdrop-blur-md lg:hidden">
      <p class="mb-2 text-center text-sm font-medium">{{ summary }}</p>
      <button class="btn-primary min-h-14 w-full text-base" form="book-form" :disabled="!canSubmit || submitting"
        type="submit">
        {{ submitting ? 'Confirming...' : 'Confirm booking' }}
      </button>
    </div>
  </div>
</template>
