<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useDataStore } from '../stores/data'
import { statusLabel } from '../domain/status'
import StatusChip from '../components/StatusChip.vue'

const route = useRoute()
const data = useDataStore()

const guest = computed(() => data.getGuest(String(route.params.id)))
const visits = computed(() => {
  if (!guest.value) return []
  return data.reservations
    .filter((r) => r.guestId === guest.value!.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
})
const completedCount = computed(() =>
  visits.value.filter((r) => ['completed', 'arrived', 'seated'].includes(r.status)).length,
)
const cancelledCount = computed(() => visits.value.filter((r) => r.status === 'cancelled').length)
const noShowCount = computed(() => visits.value.filter((r) => r.status === 'no_show').length)

function areaOf(id: string) { return data.settings.seatingAreas.find((a) => a.id === id) }

function statusHistory(reservationId: string) {
  return data.reservations.find((r) => r.id === reservationId)?.statusHistory ?? []
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <p class="text-sm"><RouterLink to="/host" class="text-gioi-moss underline">← Back to host</RouterLink></p>
    <div v-if="!guest" class="card mt-4">
      <p class="text-gioi-moss/80">Guest not found.</p>
    </div>
    <div v-else>
      <header class="card mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="font-display text-3xl font-semibold text-gioi-moss">{{ guest.fullName }}</h1>
          <p class="mt-1 text-sm text-gioi-moss/70">
            {{ guest.phone }}<span v-if="guest.email"> · {{ guest.email }}</span><span v-if="guest.country"> · {{ guest.country }}</span>
          </p>
          <p class="mt-1 text-xs text-gioi-moss/60">
            Guest since {{ new Date(guest.createdAt).toLocaleDateString() }} ·
            Marketing consent: <strong>{{ guest.marketingConsent ? 'yes' : 'no' }}</strong>
          </p>
        </div>
        <div class="text-right text-sm">
          <p class="font-semibold text-gioi-moss">{{ completedCount }} visits</p>
          <p class="text-gioi-moss/70">{{ cancelledCount }} cancelled · {{ noShowCount }} no-show</p>
        </div>
      </header>

      <section v-if="guest.allergies.length || guest.accessibility || guest.seatingPreference || guest.notes" class="mt-4 grid gap-3 sm:grid-cols-2">
        <div v-if="guest.allergies.length" class="card !p-4 ring-1 ring-danger/40">
          <p class="label !text-danger">Allergies</p>
          <p class="mt-1 text-sm">{{ guest.allergies.join(', ') }}</p>
        </div>
        <div v-if="guest.accessibility" class="card !p-4 ring-1 ring-danger/40">
          <p class="label !text-danger">Accessibility</p>
          <p class="mt-1 text-sm">{{ guest.accessibility }}</p>
        </div>
        <div v-if="guest.seatingPreference" class="card !p-4">
          <p class="label">Seating preference</p>
          <p class="mt-1 text-sm">{{ guest.seatingPreference }}</p>
        </div>
        <div v-if="guest.notes" class="card !p-4">
          <p class="label">Internal notes</p>
          <p class="mt-1 text-sm">{{ guest.notes }}</p>
        </div>
      </section>

      <section class="card mt-4">
        <h2 class="font-display text-xl font-semibold text-gioi-moss">Visit history</h2>
        <div v-if="visits.length === 0" class="mt-4 text-sm text-gioi-moss/60">No reservations yet.</div>
        <ul v-else class="mt-4 divide-y divide-gioi-sand/40">
          <li v-for="r in visits" :key="r.id" class="py-3">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p class="font-medium text-gioi-ink">
                  {{ new Date(r.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }}
                  · {{ r.time }} · {{ r.partySize }} guests
                </p>
                <p class="text-xs text-gioi-moss/70">
                  {{ areaOf(r.seatingAreaId)?.name }} · {{ r.source }} · {{ r.bookingCode }}
                  <span v-if="r.occasion"> · {{ r.occasion }}</span>
                </p>
              </div>
              <StatusChip :status="r.status" />
            </div>
            <details v-if="statusHistory(r.id).length" class="mt-1 text-xs text-gioi-moss/70">
              <summary class="cursor-pointer">Status history ({{ statusHistory(r.id).length }})</summary>
              <ul class="ml-4 mt-1 space-y-0.5">
                <li v-for="ev in statusHistory(r.id)" :key="ev.id">
                  {{ new Date(ev.at).toLocaleString() }} ·
                  {{ ev.fromStatus ? statusLabel(ev.fromStatus) + ' → ' : '' }}{{ statusLabel(ev.toStatus) }} · {{ ev.actorName }}
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>