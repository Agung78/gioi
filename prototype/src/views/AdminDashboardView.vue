<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useDataStore } from '../stores/data'
import { dashboardData, defaultDashboardFilters, describeDayLabel, resolveDateRange, type DateRangePreset } from '../domain/analytics'
import { CHANNELS, TERMINAL_STATUSES, ACTIVE_STATUSES, type ReservationStatus, type FeedbackResponse } from '../domain/types'
import { statusLabel } from '../domain/status'
import { todayISO } from '../domain/dates'
import BarChart from '../components/BarChart.vue'
import Sparkline from '../components/Sparkline.vue'
import StatusChip from '../components/StatusChip.vue'

const data = useDataStore()
const today = todayISO()
const preset = ref<DateRangePreset>('last30')
const filters = ref(defaultDashboardFilters(today))
const dashboard = computed(() => dashboardData(data.settings, data.reservations, data.guests, today, filters.value))
const statusOptions: ReservationStatus[] = [...ACTIVE_STATUSES, ...TERMINAL_STATUSES]

function setPreset(next: DateRangePreset) {
  preset.value = next
  const range = resolveDateRange(next, today, filters.value.rangeStart, filters.value.rangeEnd)
  filters.value = { ...filters.value, rangeStart: range.start, rangeEnd: range.end }
}

const occasions = computed(() => [...new Set(data.reservations.map((r) => r.occasion?.trim() || 'No occasion'))].sort())
const guestName = (id: string) => data.guests.find((g) => g.id === id)?.fullName ?? 'Unknown guest'
const areaName = (id: string) => data.settings.seatingAreas.find((a) => a.id === id)?.name ?? id
const rangeLabel = computed(() => `${filters.value.rangeStart} → ${filters.value.rangeEnd}`)
const feedbackAverage = computed(() => data.feedbackResponses.length ? (data.feedbackResponses.reduce((sum, r) => sum + r.rating, 0) / data.feedbackResponses.length).toFixed(1) : '—')
const selectedFeedback = ref<FeedbackResponse | null>(null)
const guestOf = (id: string) => data.guests.find((g) => g.id === id)
const reservationOf = (id: string) => data.reservations.find((r) => r.id === id)
const upcoming7Days = computed(() => dashboard.value.upcoming7.daysBreakdown.map((d) => ({ label: describeDayLabel(d.date, today), value: d.covers, meta: `(${d.fillPercent}%)` })))
const upcoming30Days = computed(() => dashboard.value.upcoming30.daysBreakdown.map((d) => ({ label: describeDayLabel(d.date, today), value: d.covers, meta: `(${d.fillPercent}%)` })))
const channelRows = computed(() => dashboard.value.channel.rows.map((r) => ({ label: r.channel, value: r.covers, meta: `${r.bookings} bk · ${r.share}%` })))
const occasionRows = computed(() => dashboard.value.guestMix.occasionMix.map((o) => ({ label: o.occasion, value: o.covers })))
const partySizeRows = computed(() => dashboard.value.guestMix.partySizeMix.map((p) => ({ label: `${p.bucket} pax`, value: p.bookings })))
const reliabilityValues = computed(() => dashboard.value.reliability.byDay.map((d) => d.noShowRate))
const sparklineDates = computed(() => dashboard.value.upcoming30.daysBreakdown.map((d) => d.covers))
const cueLabel: Record<string, string> = { slot_over_capacity: 'Slot over capacity', no_show_rate_high: 'No-show rate above target', cancellation_rate_high: 'Cancellation rate high', allergy_repeat_today: 'Allergy repeat guest today' }
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <header class="mb-6 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-gioi-moss/70">Manager dashboard</p>
        <h1 class="font-display text-3xl font-semibold text-gioi-moss">
          {{ new Date(today + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}
        </h1>
      </div>
      <p class="text-sm text-gioi-moss/60">Live · {{ rangeLabel }}</p>
    </header>

    <section class="card mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
      <label class="label">Range<select v-model="preset" class="input mt-1" @change="setPreset(preset)"><option value="today">Today</option><option value="last7">Last 7 days</option><option value="last30">Last 30 days</option><option value="custom">Custom</option></select></label>
      <label v-if="preset === 'custom'" class="label">From<input v-model="filters.rangeStart" type="date" class="input mt-1"></label>
      <label v-if="preset === 'custom'" class="label">To<input v-model="filters.rangeEnd" type="date" class="input mt-1"></label>
      <label class="label">Status<select v-model="filters.status" class="input mt-1"><option value="all">All statuses</option><option v-for="status in statusOptions" :key="status" :value="status">{{ statusLabel(status) }}</option></select></label>
      <label class="label">Source<select v-model="filters.source" class="input mt-1"><option value="all">All sources</option><option v-for="source in CHANNELS" :key="source" :value="source">{{ source }}</option></select></label>
      <label class="label">Area<select v-model="filters.seatingAreaId" class="input mt-1"><option value="all">All areas</option><option v-for="area in data.settings.seatingAreas" :key="area.id" :value="area.id">{{ area.name }}</option></select></label>
      <label class="label">Occasion<select v-model="filters.occasion" class="input mt-1"><option value="all">All occasions</option><option v-for="occasion in occasions" :key="occasion" :value="occasion">{{ occasion }}</option></select></label>
    </section>

    <section v-if="dashboard.cues.length" class="mb-6 space-y-2">
      <h2 class="font-display text-lg font-semibold text-gioi-moss">Action cues</h2>
      <ul class="space-y-1.5">
        <li
          v-for="(cue, i) in dashboard.cues"
          :key="i"
          class="alert-warn"
          :class="cue.severity === 'danger' ? 'alert-danger' : ''"
        >
          <strong>{{ cueLabel[cue.kind] ?? cue.kind }}:</strong> {{ cue.message }}
        </li>
      </ul>
    </section>

    <div class="grid gap-4 lg:grid-cols-3">
      <section class="card">
        <h3 class="font-display text-lg font-semibold text-gioi-moss">Today live</h3>
        <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-gioi-moss/60">Bookings</dt>
            <dd class="text-2xl font-semibold text-gioi-ink">{{ dashboard.today.bookings }}</dd>
          </div>
          <div>
            <dt class="text-gioi-moss/60">Expected covers</dt>
            <dd class="text-2xl font-semibold text-gioi-ink">{{ dashboard.today.expectedCovers }}</dd>
          </div>
          <div>
            <dt class="text-gioi-moss/60">Arrived</dt>
            <dd class="text-lg text-gioi-ink">{{ dashboard.today.arrivedCovers }}</dd>
          </div>
          <div>
            <dt class="text-gioi-moss/60">Seated</dt>
            <dd class="text-lg text-gioi-ink">{{ dashboard.today.seatedCovers }}</dd>
          </div>
          <div>
            <dt class="text-gioi-moss/60">Completed</dt>
            <dd class="text-lg text-gioi-ink">{{ dashboard.today.completedCovers }}</dd>
          </div>
          <div>
            <dt class="text-gioi-moss/60">No-shows / cancellations</dt>
            <dd class="text-lg text-gioi-ink">{{ dashboard.today.noShows }} / {{ dashboard.today.cancellations }}</dd>
          </div>
          <div class="col-span-2 mt-2">
            <dt class="text-gioi-moss/60">Capacity fill</dt>
            <dd class="mt-1">
              <div class="h-3 w-full overflow-hidden rounded bg-gioi-sand/40">
                <div
                  class="h-full rounded bg-gioi-moss transition-all"
                  :style="{ width: `${Math.min(100, dashboard.today.occupancyPercent)}%` }"
                />
              </div>
              <p class="mt-1 text-xs text-gioi-moss/70">{{ dashboard.today.occupancyPercent }}% of total capacity</p>
            </dd>
          </div>
        </dl>
      </section>

      <section class="card lg:col-span-2">
        <h3 class="font-display text-lg font-semibold text-gioi-moss">Next 7 days — covers</h3>
        <BarChart :rows="upcoming7Days" color="#3f4a2a" />
        <p v-if="dashboard.upcoming7.busiestSlot" class="mt-3 text-xs text-gioi-moss/70">
          Busiest slot: <strong>{{ dashboard.upcoming7.busiestSlot.time }}</strong> ({{ dashboard.upcoming7.busiestSlot.covers }} covers)
        </p>
      </section>

      <section class="card lg:col-span-3">
        <h3 class="font-display text-lg font-semibold text-gioi-moss">Next 30 days — covers per day</h3>
        <Sparkline :values="sparklineDates" :height="120" />
        <div class="mt-3 grid grid-cols-7 gap-1 text-xs text-gioi-moss/80 sm:grid-cols-14">
          <span v-for="d in dashboard.upcoming30.daysBreakdown" :key="d.date">
            {{ new Date(d.date + 'T00:00:00').getDate() }}
          </span>
        </div>
      </section>

      <section class="card">
        <h3 class="font-display text-lg font-semibold text-gioi-moss">Guest mix</h3>
        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between"><dt class="text-gioi-moss/70">Total guests</dt><dd>{{ dashboard.guestMix.totalGuests }}</dd></div>
          <div class="flex justify-between"><dt class="text-gioi-moss/70">First-timers</dt><dd>{{ dashboard.guestMix.firstTimers }}</dd></div>
          <div class="flex justify-between"><dt class="text-gioi-moss/70">Repeats</dt><dd>{{ dashboard.guestMix.repeatGuests }}</dd></div>
          <div class="flex justify-between"><dt class="text-gioi-moss/70">Retention share</dt><dd><strong>{{ dashboard.guestMix.retentionShare }}%</strong></dd></div>
        </dl>
        <h4 class="mt-4 label">Occasions</h4>
        <BarChart :rows="occasionRows" color="#b7612f" />
        <h4 class="mt-4 label">Party size</h4>
        <BarChart :rows="partySizeRows" color="#6e7a4a" />
      </section>

      <section class="card">
        <h3 class="font-display text-lg font-semibold text-gioi-moss">Channel performance (last 30d)</h3>
        <BarChart :rows="channelRows" color="#3f4a2a" />
        <p class="mt-3 text-xs text-gioi-moss/60">
          {{ dashboard.channel.totalBookings }} bookings · {{ dashboard.channel.totalCovers }} covers
        </p>
      </section>

      <section class="card">
        <h3 class="font-display text-lg font-semibold text-gioi-moss">Reliability (last 30d)</h3>
        <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-gioi-moss/60">No-show rate</dt>
            <dd :class="['text-2xl font-semibold', dashboard.reliability.noShowRate > data.settings.noShowTargetPercent ? 'text-danger' : 'text-gioi-ink']">
              {{ dashboard.reliability.noShowRate }}%
            </dd>
            <p class="text-xs text-gioi-moss/60">Target ≤ {{ data.settings.noShowTargetPercent }}%</p>
          </div>
          <div>
            <dt class="text-gioi-moss/60">Cancellation rate</dt>
            <dd class="text-2xl font-semibold text-gioi-ink">{{ dashboard.reliability.cancellationRate }}%</dd>
          </div>
          <div>
            <dt class="text-gioi-moss/60">Avg lead time</dt>
            <dd class="text-lg text-gioi-ink">{{ dashboard.reliability.averageLeadTimeHours }}h</dd>
          </div>
          <div>
            <dt class="text-gioi-moss/60">Total realised</dt>
            <dd class="text-lg text-gioi-ink">{{ dashboard.reliability.totalRealised }}</dd>
          </div>
        </dl>
        <h4 class="mt-4 label">No-show rate trend</h4>
        <Sparkline :values="reliabilityValues" :height="80" color="#b7612f" fill="rgba(183, 97, 47, 0.12)" />
      </section>
    </div>
    <section class="card mt-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2"><h3 class="font-display text-lg font-semibold text-gioi-moss">Guest feedback</h3><span class="text-sm text-gioi-moss/60">{{ data.feedbackResponses.length }} responses · {{ feedbackAverage }}/5 average</span></div>
      <div v-if="data.feedbackResponses.length" class="mt-4 space-y-3">
        <article
          v-for="response in data.feedbackResponses.slice(0, 10)"
          :key="response.id"
          class="group rounded-input bg-line/30 p-3 text-sm cursor-pointer transition hover:bg-line/60 focus:outline-none focus:ring-2 focus:ring-accent"
          tabindex="0"
          role="button"
          aria-label="View feedback details"
          @click="selectedFeedback = response"
          @keydown.enter="selectedFeedback = response"
        >
          <div class="flex justify-between gap-3"><strong class="group-hover:text-accent">{{ guestName(response.guestId) }}</strong><span class="text-xs text-gioi-moss/70">{{ response.rating }}/5 · {{ new Date(response.submittedAt).toLocaleDateString() }}</span></div>
          <p v-if="response.comments" class="mt-1 text-gioi-ink">{{ response.comments }}</p>
          <div class="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p v-if="response.serviceTags.length" class="text-xs text-gioi-moss/70">{{ response.serviceTags.join(' · ') }}</p>
            <span class="text-xs font-medium text-accent underline underline-offset-2">View details →</span>
          </div>
        </article>
      </div>
      <p v-else class="mt-4 text-sm text-gioi-moss/60">No native feedback responses yet.</p>
    </section>
    <!-- Feedback detail modal -->
    <Transition name="modal">
      <div
        v-if="selectedFeedback"
        class="modal-backdrop fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/50 p-4"
        @click.self="selectedFeedback = null"
      >
        <div class="modal-panel card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-wide text-gioi-moss/70">Feedback detail</p>
              <h2 class="font-display text-2xl font-semibold text-gioi-moss">
                {{ guestOf(selectedFeedback.guestId)?.fullName ?? 'Guest feedback' }}
              </h2>
            </div>
            <button class="btn-ghost" type="button" @click="selectedFeedback = null">Close</button>
          </div>

          <div class="mt-4 space-y-4 text-sm">
            <div class="rounded-input bg-line/30 p-3">
              <div class="flex items-center justify-between">
                <span class="font-medium text-gioi-moss">Rating</span>
                <span class="text-lg font-bold text-accent">{{ selectedFeedback.rating }} / 5</span>
              </div>
              <div v-if="selectedFeedback.serviceTags?.length" class="mt-2">
                <span class="text-xs text-gioi-moss/70">Standout tags:</span>
                <div class="mt-1 flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in selectedFeedback.serviceTags"
                    :key="tag"
                    class="rounded-full bg-line px-2.5 py-0.5 text-xs text-gioi-ink"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="label">Comments</h4>
              <p
                class="mt-1 rounded-input bg-line/20 p-3 text-gioi-ink"
                :class="{ 'italic text-gioi-moss/60': !selectedFeedback.comments }"
              >
                {{ selectedFeedback.comments || 'No comments provided.' }}
              </p>
            </div>

            <div v-if="reservationOf(selectedFeedback.reservationId)" class="rounded-input border border-gioi-sand/60 p-3">
              <div class="flex items-center justify-between">
                <h4 class="label">Linked reservation</h4>
                <span class="font-mono text-xs text-gioi-moss/80">
                  {{ reservationOf(selectedFeedback.reservationId)!.bookingCode }}
                </span>
              </div>
              <dl class="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt class="text-gioi-moss/60">Date & time</dt>
                  <dd class="font-medium text-gioi-ink">
                    {{ reservationOf(selectedFeedback.reservationId)!.date }} · {{ reservationOf(selectedFeedback.reservationId)!.time }}
                  </dd>
                </div>
                <div>
                  <dt class="text-gioi-moss/60">Party & area</dt>
                  <dd class="font-medium text-gioi-ink">
                    {{ reservationOf(selectedFeedback.reservationId)!.partySize }} guests · {{ areaName(reservationOf(selectedFeedback.reservationId)!.seatingAreaId) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-gioi-moss/60">Source</dt>
                  <dd class="font-medium text-gioi-ink capitalize">
                    {{ reservationOf(selectedFeedback.reservationId)!.source }}
                  </dd>
                </div>
                <div v-if="reservationOf(selectedFeedback.reservationId)!.occasion">
                  <dt class="text-gioi-moss/60">Occasion</dt>
                  <dd class="font-medium text-gioi-ink">
                    {{ reservationOf(selectedFeedback.reservationId)!.occasion }}
                  </dd>
                </div>
              </dl>
            </div>

            <div v-if="guestOf(selectedFeedback.guestId)" class="flex items-center justify-between rounded-input bg-line/20 p-3">
              <div class="text-xs">
                <p class="font-medium text-gioi-ink">{{ guestOf(selectedFeedback.guestId)!.fullName }}</p>
                <p class="text-gioi-moss/70">{{ guestOf(selectedFeedback.guestId)!.phone }}</p>
              </div>
              <RouterLink
                :to="{ name: 'guest', params: { id: selectedFeedback.guestId } }"
                class="btn-primary !py-1.5 !px-3 !text-xs"
              >
                Open guest profile →
              </RouterLink>
            </div>

            <p class="text-right text-xs text-gioi-moss/60">
              Submitted {{ new Date(selectedFeedback.submittedAt).toLocaleString() }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
    <section class="card mt-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="font-display text-lg font-semibold text-gioi-moss">Filtered reservations</h3>
        <span class="text-sm text-gioi-moss/60">{{ dashboard.filtered.length }} matching</span>
      </div>
      <div v-if="dashboard.filtered.length" class="mt-4 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead><tr class="border-b border-gioi-sand/60 text-gioi-moss/60"><th class="p-2">Date</th><th class="p-2">Guest</th><th class="p-2">Party</th><th class="p-2">Area</th><th class="p-2">Source</th><th class="p-2">Status</th></tr></thead>
          <tbody><tr v-for="reservation in dashboard.filtered.slice(0, 50)" :key="reservation.id" class="border-b border-gioi-sand/30"><td class="p-2">{{ reservation.date }} {{ reservation.time }}</td><td class="p-2">{{ guestName(reservation.guestId) }}<div class="text-xs text-gioi-moss/60">{{ reservation.bookingCode }}</div></td><td class="p-2">{{ reservation.partySize }}</td><td class="p-2">{{ areaName(reservation.seatingAreaId) }}</td><td class="p-2">{{ reservation.source }}</td><td class="p-2"><StatusChip :status="reservation.status" /></td></tr></tbody>
        </table>
        <p v-if="dashboard.filtered.length > 50" class="mt-2 text-xs text-gioi-moss/60">Showing first 50 reservations.</p>
      </div>
      <p v-else class="mt-4 text-sm text-gioi-moss/60">No reservations match these filters.</p>
    </section>
  </div>
</template>