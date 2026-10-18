<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '../stores/data'
import { useReservationsStore } from '../stores/reservations'
import { useAuthStore } from '../stores/auth'
import { todayISO, addDays } from '../domain/dates'
import { PhWarning, PhWheelchair, PhStar, PhWhatsappLogo } from '@phosphor-icons/vue'
import StatusChip from '../components/StatusChip.vue'
import type { Reservation, ReservationStatus } from '../domain/types'
import { feedbackWhatsAppUrl } from '../domain/feedback'
import StatusButtons from '../components/StatusButtons.vue'
import GuestSearch from '../components/GuestSearch.vue'
import WalkInModal from '../components/WalkInModal.vue'

const data = useDataStore()
const reservations = useReservationsStore()
const auth = useAuthStore()
const router = useRouter()

const date = ref(todayISO())
const showWalkIn = ref(false)
const lastError = ref<string | null>(null)
const tab = ref<'today' | 'search'>('today')

const todays = computed(() => data.reservationsByDate(date.value))
const activeCount = computed(() =>
  todays.value.filter((r) => ['confirmed', 'arrived', 'seated', 'pending'].includes(r.status)).length,
)

function changeStatus(r: Reservation, to: ReservationStatus) {
  const result = reservations.changeStatus(r.id, to, auth.userId ?? 'u-host', auth.user?.name ?? 'Host')
  if (!result.ok) lastError.value = result.error ?? 'Cannot change status.'
  else lastError.value = null
}

function openGuest(r: Reservation) {
  router.push({ name: 'guest', params: { id: r.guestId } })
}

function guestOf(r: Reservation) { return data.getGuest(r.guestId) }
function areaOf(r: Reservation) { return data.settings.seatingAreas.find((a) => a.id === r.seatingAreaId) }

function sendFeedback(r: Reservation) {
  const guest = guestOf(r)
  if (!guest) return
  const url = feedbackWhatsAppUrl(data.settings, r, guest, window.location.origin)
  if (!url) {
    lastError.value = 'This guest does not have a valid WhatsApp number.'
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  data.appendAudit({ id: `feedback_${Date.now()}`, at: new Date().toISOString(), actorId: auth.userId ?? 'u-host', actorName: auth.user?.name ?? 'Host', action: 'feedback_link.sent', entityType: 'feedback_link', entityId: r.id, note: `WhatsApp feedback link opened for ${guest.fullName}` })
  lastError.value = null
}

function isAllergyAlert(r: Reservation): boolean {
  return (guestOf(r)?.allergies?.length ?? 0) > 0
}
function isAccessibilityAlert(r: Reservation): boolean {
  return !!guestOf(r)?.accessibility
}
function visitCount(guestId: string): number {
  return data.reservations.filter((r) =>
    r.guestId === guestId && ['arrived', 'seated', 'completed'].includes(r.status),
  ).length
}
function isRepeat(r: Reservation): boolean {
  return visitCount(r.guestId) > 1
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-muted">Service day</p>
        <h1 class="font-display text-3xl font-extrabold">
          {{ new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}
        </h1>
        <p class="text-sm text-muted">{{ todays.length }} bookings · {{ activeCount }} active</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn-ghost min-h-12" type="button" @click="date = addDays(date, -1)">Previous</button>
        <button class="btn-ghost min-h-12" type="button" @click="date = todayISO()">Today</button>
        <input v-model="date" type="date" class="field !w-auto !py-1 !px-2.5 text-sm" aria-label="Service date" />
        <button class="btn-ghost min-h-12" type="button" @click="date = addDays(date, 1)">Next</button>
        <button class="btn-primary min-h-12" type="button" @click="showWalkIn = true">+ Walk-in</button>
      </div>
    </header>

    <div v-if="lastError" class="alert-danger mb-4">{{ lastError }}</div>

    <nav class="mb-4 flex gap-1 rounded-full bg-line/40 p-1">
      <button
        class="min-h-12 flex-1 rounded-full px-3 text-base font-medium"
        :class="tab === 'today' ? 'bg-raised shadow-soft' : 'text-muted'"
        type="button"
        @click="tab = 'today'"
      >
        Today's service
      </button>
      <button
        class="min-h-12 flex-1 rounded-full px-3 text-base font-medium"
        :class="tab === 'search' ? 'bg-raised shadow-soft' : 'text-muted'"
        type="button"
        @click="tab = 'search'"
      >
        Guest search
      </button>
    </nav>

    <Transition name="fade" mode="out-in">
    <section v-if="tab === 'search'" key="search" class="card">
      <h2 class="font-display text-xl font-bold">Find a guest</h2>
      <p class="mt-1 text-sm text-muted">Search by name, phone, or email to see their visit history and notes.</p>
      <div class="mt-4">
        <GuestSearch />
      </div>
    </section>

    <section v-else key="today">
      <div v-if="todays.length === 0" class="card text-center">
        <p class="text-muted">No bookings for this day.</p>
      </div>
      <div v-else class="space-y-6">
        <div v-for="group in groupByTime(todays)" :key="group.time">
          <div class="mb-2 flex items-baseline gap-3">
            <h2 class="font-display text-xl font-bold">{{ group.time }}</h2>
            <p class="text-sm text-muted">{{ group.items.length }} booking{{ group.items.length === 1 ? '' : 's' }} · {{ group.covers }} covers</p>
          </div>
          <div class="space-y-3">
            <article
              v-for="r in group.items"
              :key="r.id"
              class="card"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <button
                      class="-my-2 min-h-11 py-2 text-left font-display text-lg font-bold hover:underline"
                      type="button"
                      @click="openGuest(r)"
                    >
                      {{ guestOf(r)?.fullName }}
                    </button>
                    <span v-if="isRepeat(r)" class="chip bg-accent/15 text-accent"><PhStar :size="14" weight="fill" aria-hidden="true" /> Repeat</span>
                  </div>
                  <p class="text-sm text-muted">
                    {{ r.partySize }} guests · {{ areaOf(r)?.name }} · {{ r.bookingCode }} · {{ r.source }}
                  </p>
                  <p v-if="r.occasion" class="mt-1 text-xs text-muted">{{ r.occasion }}</p>
                </div>
                <StatusChip :status="r.status" />
              </div>

              <div v-if="isAllergyAlert(r) || isAccessibilityAlert(r) || r.guestNotes || r.internalNotes" class="mt-3 space-y-2">
                <div v-if="isAllergyAlert(r)" class="alert-danger flex items-center gap-2 text-base font-semibold">
                  <PhWarning :size="22" weight="fill" aria-hidden="true" /> Allergies: {{ guestOf(r)?.allergies.join(', ') }}
                </div>
                <div v-if="isAccessibilityAlert(r)" class="alert-warn flex items-center gap-2">
                  <PhWheelchair :size="22" aria-hidden="true" /> <strong>Accessibility:</strong> {{ guestOf(r)?.accessibility }}
                </div>
                <div v-if="r.guestNotes" class="rounded-input bg-line/40 p-3 text-sm">
                  <strong class="text-ink">Guest note:</strong> {{ r.guestNotes }}
                </div>
                <div v-if="r.internalNotes" class="rounded-input bg-line/40 p-3 text-sm">
                  <strong class="text-ink">Internal:</strong> {{ r.internalNotes }}
                </div>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-3">
                <StatusButtons :reservation="r" @change="(to) => changeStatus(r, to)" />
                <button v-if="r.status === 'completed'" class="btn-ghost inline-flex items-center gap-2" type="button" @click="sendFeedback(r)">
                  <PhWhatsappLogo :size="20" aria-hidden="true" /> Send feedback via WhatsApp
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
    </Transition>

    <WalkInModal :open="showWalkIn" @close="showWalkIn = false" @created="lastError = null" />
  </div>
</template>

<script lang="ts">
function groupByTime(reservations: import('../domain/types').Reservation[]) {
  const map = new Map<string, import('../domain/types').Reservation[]>()
  for (const r of reservations) {
    if (!map.has(r.time)) map.set(r.time, [])
    map.get(r.time)!.push(r)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, items]) => ({
      time,
      items,
      covers: items.filter((r) => !['cancelled', 'no_show'].includes(r.status))
        .reduce((s, r) => s + r.partySize, 0),
    }))
}
export { groupByTime }
</script>