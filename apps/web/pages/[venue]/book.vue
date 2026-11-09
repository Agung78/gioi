<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, useHead } from '#app'
import { addDays, todayISO, isOpenOn, hoursFor, checkAvailability } from '@gioi/domain'
import { PhArrowLeft, PhCaretDown, PhMinus, PhPlus } from '@phosphor-icons/vue'
import DatePicker from '@/components/DatePicker.vue'
import AvailabilityGrid from '@/components/AvailabilityGrid.vue'
import { createReservation } from '@/composables/useGuestApi'
import FloorPlanSvg from '@/components/FloorPlanSvg.vue'
import type { PublicFloorPlan } from '@gioi/domain'
import type { CreateReservationBody } from '@/types/venue'

useHead({ title: 'Reserve a table | GIOI Ocean Gourmet' })
const route = useRoute()
const router = useRouter()
const venue = (route.params.venue as string) || 'bali'

const { data: venueData, pending, error: venueError } = await useFetch<any>(`/api/public/venues/${venue}`, { server: true })

const settings = computed(() => {
  const v = venueData.value
  if (!v) return null
  const oh: Record<string, { open: string; close: string }> = {}
  for (const [k, h] of Object.entries(v.openingHours as Record<string, { open: string; close: string }>)) {
    const day = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][Number(k)]
    if (day) oh[day] = h as { open: string; close: string }
  }
  return {
    restaurant: v,
    openingHours: oh,
    closedDates: v.closedDates,
    bookingIntervalMinutes: v.bookingIntervalMinutes,
    partySizeLimits: v.partySizeLimits,
    leadTimeMinutes: v.leadTimeMinutes,
    cutoffMinutes: v.cutoffMinutes,
    seatingAreas: v.seatingAreas,
    cancellationPolicy: v.cancellationPolicy,
  } as any
})

const today = todayISO()
const date = ref<string>(typeof route.query.date === 'string' ? route.query.date : today)
const partySize = ref<number>(Number(route.query.party ?? 2) || 2)
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

const posthog = usePostHog()

function capture(event: string, props: Record<string, unknown> = {}) {
  posthog?.capture(event, props)
}

const bookableAreas = computed(() => settings.value?.seatingAreas.filter((a: any) => a.bookable) ?? [])

function fits(a: any) {
  return (!a.minParty || partySize.value >= a.minParty) && (!a.maxParty || partySize.value <= a.maxParty)
}

function toggleDiet(d: string) {
  dietary.value = dietary.value.includes(d) ? dietary.value.filter((x) => x !== d) : [...dietary.value, d]
}

const summary = computed(() => {
  if (!settings.value) return ''
  const d = new Date(date.value + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  return `${d} · ${time.value ?? 'pick a time'} · ${partySize.value} ${partySize.value === 1 ? 'guest' : 'guests'}`
})

const error = ref<string | null>(null)

const days = computed(() => {
  if (!settings.value) return []
  return Array.from({ length: 14 }, (_, i) => {
    const iso = addDays(today, i)
    const hours = hoursFor(settings.value, iso)
    const isClosed = !isOpenOn(settings.value, iso)
    return { iso, isClosed, hours }
  })
})

const slots = ref<any[]>([])
const slotPending = ref(false)

async function fetchSlots() {
  if (!settings.value) return
  slotPending.value = true
  try {
    const url = new URL(`/api/public/venues/${venue}/availability`, location.origin)
    url.searchParams.set('date', date.value)
    url.searchParams.set('party', String(partySize.value))
    if (seatingAreaId.value) url.searchParams.set('area', seatingAreaId.value)
    const res = await fetch(url.toString(), { credentials: 'include' })
    const json = await res.json()
    slots.value = json.slots ?? []
    capture('slots_viewed', {
      date: date.value,
      party_size: partySize.value,
      slots_total: slots.value.length,
      slots_available: slots.value.filter((s) => s.open && (s.remaining == null || s.remaining >= partySize.value)).length,
      days_ahead: Math.ceil((new Date(date.value).getTime() - new Date(today).getTime()) / 86400000),
    })
  } finally {
    slotPending.value = false
  }
}

// Party change: drop a selected area the party no longer fits (runs before the refetch watcher below).
watch(partySize, () => {
  const a = bookableAreas.value.find((x: any) => x.id === seatingAreaId.value)
  if (seatingAreaId.value && (!a || !fits(a))) seatingAreaId.value = null
})

watch([date, partySize, seatingAreaId], () => {
  time.value = null
  fetchSlots()
})

const { data: floorPlan } = useFetch<PublicFloorPlan>(`/api/public/venues/${venue}/floor-plan`, { server: false, lazy: true })

const pickedIdx = ref<number | null>(null)
const chosenIdx = ref<number | null>(null) // the table the guest clicked Choose on; booking itself is by area
const chosen = computed(() => (seatingAreaId.value && chosenIdx.value != null && floorPlan.value?.tables[chosenIdx.value]?.seatingAreaId === seatingAreaId.value ? chosenIdx.value : null))
const tableInfo = (i: number) => {
  const t = floorPlan.value?.tables[i]
  const area = t && settings.value?.seatingAreas.find((a: any) => a.id === t.seatingAreaId)
  return t && area ? { table: t, area, fits: fits(area) } : null
}
const picked = computed(() => (pickedIdx.value == null ? null : tableInfo(pickedIdx.value)))
const onTablePick = (i: number) => { pickedIdx.value = i }
onMounted(() => {
  const esc = (e: KeyboardEvent) => e.key === 'Escape' && (pickedIdx.value = null)
  window.addEventListener('keydown', esc)
  onBeforeUnmount(() => window.removeEventListener('keydown', esc))
})

watch(time, (t) => {
  if (t) capture('slot_selected', { time: t, date: date.value, party_size: partySize.value })
})

const slotGrid = computed(() => slots.value)

const draft = computed(() => ({
  date: date.value,
  time: time.value ?? '',
  partySize: partySize.value,
  seatingAreaId: seatingAreaId.value ?? undefined,
}))

const checkResult = computed(() => {
  if (!time.value || !settings.value) return null
  return checkAvailability(settings.value, [], draft.value)
})

const canSubmit = computed(() => {
  if (!time.value) return false
  if (!acceptedPolicy.value) return false
  if (!fullName.value.trim() || !phone.value.trim()) return false
  const r = checkResult.value
  return r?.ok === true
})

const missingStepPrompt = computed(() => {
  if (!time.value) return 'Pick a time slot'
  if (!fullName.value.trim() || !phone.value.trim()) return 'Enter full name & phone'
  if (!acceptedPolicy.value) return 'Accept cancellation policy'
  return ''
})

const activeDetailsCount = computed(
  () => dietary.value.length + (occasion.value ? 1 : 0) + (guestNotes.value.trim() ? 1 : 0),
)

const formattedDate = computed(() =>
  new Date(date.value + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
)
const seatingAreaName = computed(() => bookableAreas.value.find((a: any) => a.id === seatingAreaId.value)?.name)

const turnstileSiteKey = useRuntimeConfig().public.turnstileSiteKey
const turnstileToken = ref<string | null>(null)

async function submit() {
  error.value = null
  if (!time.value) return
  const r = checkResult.value
  if (!r?.ok) {
    capture('booking_submit_failed', { reason: 'slot_taken', date: date.value, party_size: partySize.value })
    error.value = 'That time just filled up. Pick another slot above.'
    time.value = null
    document.getElementById('when')?.scrollIntoView({ behavior: 'smooth' })
    return
  }
  if (turnstileSiteKey && !turnstileToken.value) {
    capture('booking_submit_failed', { reason: 'turnstile', date: date.value, party_size: partySize.value })
    error.value = 'Please complete the verification.'
    return
  }
  submitting.value = true
  try {
    const allergies = [...dietary.value, ...allergiesText.value.split(',').map((s) => s.trim()).filter(Boolean)]
    const body: CreateReservationBody = {
      guestName: fullName.value.trim(),
      phone: phone.value.trim(),
      email: email.value.trim() || undefined,
      date: date.value,
      time: time.value,
      partySize: partySize.value,
      seatingAreaId: seatingAreaId.value ?? undefined,
      occasion: occasion.value.trim() || undefined,
      guestNotes: guestNotes.value.trim() || undefined,
      allergies: allergies.length ? allergies : undefined,
      accessibility: accessibility.value.trim() || undefined,
      idempotencyKey: crypto.randomUUID(),
      source: bookingSource(route.query.src),
      ...(turnstileToken.value ? { turnstileToken: turnstileToken.value } : {}),
    }
    const res = await createReservation(venue, body, posthog?.get_distinct_id())
    router.push(`/${venue}/confirmation/${res.bookingCode}`)
  } catch (e: any) {
    if (e?.statusCode === 409) {
      capture('booking_submit_failed', { reason: 'slot_taken', date: date.value, party_size: partySize.value })
      error.value = 'That time just filled up. Pick another slot above.'
      time.value = null
      fetchSlots()
    } else {
      capture('booking_submit_failed', { reason: 'other', date: date.value, party_size: partySize.value })
      error.value = e.message || 'Booking failed. Try again.'
    }
  } finally {
    submitting.value = false
  }
}

const partyOptions = computed(() => {
  if (!settings.value) return [2]
  const lo = settings.value.partySizeLimits.min
  const hi = settings.value.partySizeLimits.max
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
})

onMounted(() => {
  fetchSlots()
})
</script>

<template>
  <div v-if="pending" class="mx-auto max-w-5xl px-4 pt-8 pb-32 text-center">
    <p class="text-muted">Loading…</p>
  </div>
  <div v-else-if="venueError || !settings" class="mx-auto max-w-5xl px-4 pt-8 pb-32 text-center">
    <p class="text-muted">Venue not found.</p>
  </div>
  <div v-else class="mx-auto max-w-5xl px-4 pb-32 pt-8 md:px-8 lg:pb-16">
    <div class="flex items-center justify-between">
      <NuxtLink :to="`/${venue}`" class="btn-ghost !min-h-10 !px-3 -ml-3 gap-2 text-sm text-ink">
        <PhArrowLeft :size="16" aria-hidden="true" />
        Back to GIOI
      </NuxtLink>
    </div>
    <h1 class="mt-3 text-3xl font-extrabold md:text-4xl">Book a table</h1>

    <div class="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <form id="book-form" class="min-w-0 space-y-10" @submit.prevent="submit" @focusin.once="capture('booking_form_started')">
        <section id="when" class="space-y-5">
          <h2 class="text-xl font-bold">1. When</h2>
          <div>
            <span class="label">Date</span>
            <div class="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:scroll-px-0 md:px-0">
              <button v-for="d in days" :key="d.iso" type="button"
                class="pill min-h-16 shrink-0 snap-start flex-col px-4"
                :class="[date === d.iso ? 'pill-on' : '', d.isClosed ? 'cursor-not-allowed opacity-40' : 'hover:border-accent']"
                :aria-disabled="d.isClosed" :disabled="d.isClosed" :aria-pressed="date === d.iso"
                @click="date = d.iso; time = null">
                <span class="text-xs">{{ new Date(d.iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }) }}</span>
                <span class="text-lg font-bold leading-tight">{{ new Date(d.iso + 'T00:00:00').getDate() }}</span>
              </button>
            </div>
            <label class="mt-2 inline-flex items-center gap-2 text-sm text-muted">
              More dates
              <DatePicker :model-value="date" :min="today" :closed="settings.closedDates" class="min-h-11 py-1.5 text-sm"
                @update:model-value="date = $event; time = null" />
            </label>
          </div>
          <div>
            <span class="label" id="guests-label">Guests</span>
            <div class="inline-flex items-center gap-4" role="group" aria-labelledby="guests-label">
              <button type="button" class="pill h-12 w-12 px-0 text-xl" aria-label="Fewer guests"
                :disabled="partySize <= partyOptions[0]" @click="partySize--"><PhMinus :size="16" aria-hidden="true" /></button>
              <span class="w-8 text-center text-xl font-bold" aria-live="polite">{{ partySize }}</span>
              <button type="button" class="pill h-12 w-12 px-0 text-xl" aria-label="More guests"
                :disabled="partySize >= partyOptions[partyOptions.length - 1]" @click="partySize++"><PhPlus :size="16" aria-hidden="true" /></button>
            </div>
            <p v-if="partySize >= partyOptions[partyOptions.length - 1]" class="mt-2 text-sm text-muted">
              Groups over {{ partySize }}? <a class="font-medium text-accent underline underline-offset-4"
                :href="`https://wa.me/${settings.restaurant.whatsapp.replace(/\D/g, '')}`"
                @click="capture('whatsapp_clicked', { from: 'large_party' })">Message us on WhatsApp</a>.
            </p>
          </div>
          <div v-if="floorPlan?.tables.length" class="max-w-xl">
            <span class="label">Pick a table area</span>
            <FloorPlanSvg :plan="floorPlan" pickable :selected="pickedIdx != null ? `t:${pickedIdx}` : null" :chosen="chosen"
              :highlight-area-id="seatingAreaId" label="Venue floor plan" @table-pick="onTablePick">
              <template #tooltip="{ index }">
                <template v-for="t in [tableInfo(index)]" :key="index">
                  <template v-if="t">
                    <strong>{{ t.area.name }}</strong> · seats {{ t.table.seats }}
                    <span class="opacity-75"> · {{ !t.area.bookable ? 'not bookable online' : !t.fits ? `not for ${partySize}` : `fits ${partySize}` }}</span>
                  </template>
                </template>
              </template>
            </FloorPlanSvg>
            <p class="mt-1.5 text-xs text-muted">
              <template v-if="seatingAreaName">Selected: <strong>{{ seatingAreaName }}</strong>. </template>Hover or tap a table for details.
            </p>
            <Teleport to="body">
              <Transition name="modal">
              <div v-if="picked" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
                @click.self="pickedIdx = null">
                <div role="dialog" aria-modal="true" aria-labelledby="table-title"
                  class="modal-panel w-full max-w-sm space-y-4 rounded-surface border border-line bg-raised p-5 text-ink shadow-soft">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-widest text-muted">{{ picked.area.name }}</p>
                    <h3 id="table-title" class="text-xl font-extrabold">Table for {{ picked.table.seats }}</h3>
                  </div>
                  <p v-if="!picked.area.bookable" class="text-sm text-muted">This area isn't open for online booking. Message us to request it.</p>
                  <p v-else-if="!picked.fits" class="text-sm text-muted">
                    Not available for a party of {{ partySize }}<span v-if="picked.area.minParty"> (parties of {{ picked.area.minParty }}+)</span><span v-else-if="picked.area.maxParty"> (up to {{ picked.area.maxParty }})</span>.
                  </p>
                  <p v-else-if="picked.table.seats < partySize" class="text-sm text-muted">
                    This table seats {{ picked.table.seats }}. Your party of {{ partySize }} will be seated in {{ picked.area.name }}<template v-if="partySize > picked.table.seats">, and our host will join {{ Math.ceil(partySize / picked.table.seats) }} tables for you</template>, not at this exact table.
                  </p>
                  <p v-else class="text-sm text-muted">Fits your party of {{ partySize }}. We'll seat you in {{ picked.area.name }}.</p>
                  <div class="flex gap-2">
                    <button type="button" class="pill flex-1" @click="pickedIdx = null">Close</button>
                    <button v-if="chosen === pickedIdx" type="button" class="pill flex-1" @click="seatingAreaId = null; pickedIdx = null">Clear</button>
                    <button v-else type="button" class="pill pill-on flex-1" :disabled="!picked.area.bookable || !picked.fits" @click="seatingAreaId = picked.area.id; chosenIdx = pickedIdx; pickedIdx = null">
                      Choose {{ picked.area.name }}
                    </button>
                  </div>
                </div>
              </div>
              </Transition>
            </Teleport>
          </div>
          <div>
            <span class="label">Time</span>
            <AvailabilityGrid v-if="!slotPending" v-model="time" :slots="slotGrid" :party-size="partySize" />
            <div v-else class="text-muted text-sm">Loading slots…</div>
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
          <button type="button" class="flex min-h-11 w-full items-center justify-between text-left" :aria-expanded="showDetails"
            @click="showDetails = !showDetails">
            <h2 class="flex items-center gap-2 text-xl font-bold">3. Details <span class="text-base font-normal text-muted">(optional)</span>
              <span v-if="!showDetails && activeDetailsCount" class="chip bg-accent/15 text-accent text-xs">{{ activeDetailsCount }} added</span>
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
                  :class="dietary.includes(d) ? 'pill-on' : ''"
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
          <p class="text-sm leading-relaxed text-muted">{{ settings.cancellationPolicy }}</p>
          <label class="flex min-h-11 items-start gap-3 py-2 text-sm">
            <input v-model="acceptedPolicy" type="checkbox" class="mt-0.5 h-5 w-5 accent-[rgb(var(--accent))]" />
            <span>I understand the cancellation policy.</span>
          </label>
          <label class="flex min-h-11 items-start gap-3 py-2 text-sm">
            <input v-model="marketingConsent" type="checkbox" class="mt-0.5 h-5 w-5 accent-[rgb(var(--accent))]" />
            <span>Send me occasional news and events. (Optional)</span>
          </label>
          <div v-if="error" class="alert-danger" role="alert">{{ error }}</div>
        </section>
      </form>

      <aside class="hidden lg:block">
        <div class="card sticky top-24">
          <h2 class="text-lg font-bold">Your booking</h2>
          <dl class="mt-4 space-y-3 text-sm">
            <div class="flex items-baseline justify-between gap-3">
              <dt class="text-muted">Date &amp; party</dt>
              <dd class="text-right font-semibold">{{ formattedDate }} · {{ partySize }} {{ partySize === 1 ? 'guest' : 'guests' }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-3">
              <dt class="text-muted">Time</dt>
              <dd class="text-right" :class="time ? 'font-bold text-accent' : 'text-muted'">{{ time ?? 'Select time' }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-3">
              <dt class="text-muted">Seating</dt>
              <dd class="text-right font-semibold">{{ seatingAreaName ?? 'Any available table' }}</dd>
            </div>
          </dl>
          <p v-if="!canSubmit && missingStepPrompt" class="mt-4 rounded-surface bg-accent/10 px-3 py-2 text-sm font-medium text-ink" role="status">
            {{ missingStepPrompt }}
          </p>
          <button class="btn-primary min-h-12 w-full text-base mt-5" form="book-form" :disabled="!canSubmit || submitting" type="submit">{{ submitting ? 'Confirming…' : 'Confirm booking' }}</button>
        </div>
      </aside>
    </div>

    <div class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <p class="mb-2 text-center text-sm font-medium">{{ summary }}</p>
      <p v-if="!canSubmit && missingStepPrompt" class="mb-2 text-center text-xs font-medium text-accent" role="status">{{ missingStepPrompt }}</p>
      <button class="btn-primary min-h-14 w-full text-base" form="book-form" :disabled="!canSubmit || submitting"
        type="submit">
        {{ submitting ? 'Confirming…' : 'Confirm booking' }}
      </button>
    </div>
  </div>
</template>
