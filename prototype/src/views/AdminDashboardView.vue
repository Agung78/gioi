<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useDataStore } from '../stores/data'
import { dashboardData, defaultDashboardFilters, describeDayLabel, formatLeadTime, resolveDateRange, type ActionCue, type DateRangePreset } from '../domain/analytics'
import { CHANNELS, TERMINAL_STATUSES, ACTIVE_STATUSES, type ReservationStatus, type FeedbackResponse } from '../domain/types'
import { statusLabel } from '../domain/status'
import { todayISO } from '../domain/dates'
import { downloadCSV, reservationsCSV } from '../stores/export'
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
const periodLabel = computed(() => ({ today: 'today', last7: 'last 7 days', last30: 'last 30 days', custom: rangeLabel.value })[preset.value])
const search = ref('')
const searchedReservations = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return dashboard.value.filtered
  return dashboard.value.filtered.filter((r) => {
    const g = guestOf(r.guestId)
    return [g?.fullName, r.bookingCode, g?.phone].some((v) => v?.toLowerCase().includes(q))
  })
})
function exportCSV() {
  downloadCSV(`reservations_${filters.value.rangeStart}_${filters.value.rangeEnd}.csv`, reservationsCSV(searchedReservations.value))
}
const cueLink = (cue: ActionCue) =>
  cue.guestId ? { name: 'guest', params: { id: cue.guestId } } : cue.kind === 'slot_over_capacity' ? { name: 'host' } : null
const cueLinkLabel = (cue: ActionCue) => (cue.guestId ? 'Open guest →' : 'Open host view →')
const feedbackDistribution = computed(() => [5, 4, 3, 2, 1].map((n) => ({ label: `${n} ★`, value: data.feedbackResponses.filter((r) => r.rating === n).length })))
const feedbackTags = computed(() => {
  const counts = new Map<string, number>()
  for (const r of data.feedbackResponses) for (const t of r.serviceTags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8)
})
const asOf = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
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
const upcoming30Covers = computed(() => dashboard.value.upcoming30.daysBreakdown.map((d) => d.covers))
const upcoming30Peak = computed(() => dashboard.value.upcoming30.daysBreakdown.reduce((a, b) => (b.covers > a.covers ? b : a)))
const isMilestoneDay = (date: string, index: number) => {
  const day = new Date(date + 'T00:00:00').getDate()
  return index === 0 || index === 29 || day === 1 || day === 15 || (index + 1) % 5 === 0
}
const cueLabel:Record<string, string> = { slot_over_capacity: 'Slot over capacity', no_show_rate_high: 'No-show rate above target', cancellation_rate_high: 'Cancellation rate high', allergy_repeat_today: 'Allergy repeat guest today' }
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <header class="mb-6 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-muted">Manager dashboard</p>
        <h1 class="font-display text-3xl font-semibold text-ink">
          {{ new Date(today + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}
        </h1>
      </div>
      <p class="text-sm text-muted">Live as of {{ asOf }}</p>
    </header>

    <section class="card mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
      <label class="label">Range<select v-model="preset" class="field mt-1 !py-1.5 !px-3 text-sm" @change="setPreset(preset)"><option value="today">Today</option><option value="last7">Last 7 days</option><option value="last30">Last 30 days</option><option value="custom">Custom</option></select></label>
      <label v-if="preset === 'custom'" class="label">From<input v-model="filters.rangeStart" type="date" class="field mt-1 !py-1.5 !px-3 text-sm"></label>
      <label v-if="preset === 'custom'" class="label">To<input v-model="filters.rangeEnd" type="date" class="field mt-1 !py-1.5 !px-3 text-sm"></label>
      <label class="label">Status<select v-model="filters.status" class="field mt-1 !py-1.5 !px-3 text-sm"><option value="all">All statuses</option><option v-for="status in statusOptions" :key="status" :value="status">{{ statusLabel(status) }}</option></select></label>
      <label class="label">Source<select v-model="filters.source" class="field mt-1 !py-1.5 !px-3 text-sm"><option value="all">All sources</option><option v-for="source in CHANNELS" :key="source" :value="source">{{ source }}</option></select></label>
      <label class="label">Area<select v-model="filters.seatingAreaId" class="field mt-1 !py-1.5 !px-3 text-sm"><option value="all">All areas</option><option v-for="area in data.settings.seatingAreas" :key="area.id" :value="area.id">{{ area.name }}</option></select></label>
      <label class="label">Occasion<select v-model="filters.occasion" class="field mt-1 !py-1.5 !px-3 text-sm"><option value="all">All occasions</option><option v-for="occasion in occasions" :key="occasion" :value="occasion">{{ occasion }}</option></select></label>
      <p class="text-xs text-muted md:col-span-3 lg:col-span-6">
        Filters apply to period analytics ({{ periodLabel }}: guest mix, channels, reliability) and the reservations table. Status only narrows the table. Today live, Next 7 days and Next 30 days are always live.
      </p>
    </section>

    <section v-if="dashboard.cues.length" class="mb-6 space-y-2">
      <h2 class="font-display text-lg font-semibold text-ink">Action cues</h2>
      <ul class="space-y-1.5">
        <li
          v-for="(cue, i) in dashboard.cues"
          :key="i"
          :class="cue.severity === 'danger' ? 'alert-danger' : 'alert-warn'"
        >
          <strong>{{ cueLabel[cue.kind] ?? cue.kind }}:</strong> {{ cue.message }}
          <RouterLink v-if="cueLink(cue)" :to="cueLink(cue)!" class="ml-2 font-medium underline underline-offset-2">{{ cueLinkLabel(cue) }}</RouterLink>
        </li>
      </ul>
    </section>

    <div class="grid gap-4 lg:grid-cols-3">
      <section class="card">
        <h3 class="font-display text-lg font-semibold text-ink">Today live <span class="ml-1 text-xs font-normal text-muted">unfiltered</span></h3>
        <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-muted">Bookings</dt>
            <dd class="text-2xl font-semibold text-ink">{{ dashboard.today.bookings }}</dd>
          </div>
          <div>
            <dt class="text-muted">Expected covers</dt>
            <dd class="text-2xl font-semibold text-ink">{{ dashboard.today.expectedCovers }}</dd>
          </div>
          <div>
            <dt class="text-muted">Arrived</dt>
            <dd class="text-lg text-ink">{{ dashboard.today.arrivedCovers }}</dd>
          </div>
          <div>
            <dt class="text-muted">Seated</dt>
            <dd class="text-lg text-ink">{{ dashboard.today.seatedCovers }}</dd>
          </div>
          <div>
            <dt class="text-muted">Completed</dt>
            <dd class="text-lg text-ink">{{ dashboard.today.completedCovers }}</dd>
          </div>
          <div>
            <dt class="text-muted">No-shows / cancellations</dt>
            <dd class="text-lg text-ink">{{ dashboard.today.noShows }} / {{ dashboard.today.cancellations }}</dd>
          </div>
          <div class="col-span-2 mt-2">
            <dt class="text-muted">Capacity fill</dt>
            <dd class="mt-1">
              <div class="h-3 w-full overflow-hidden rounded bg-line/40">
                <div
                  class="h-full rounded bg-accent transition-all"
                  :style="{ width: `${Math.min(100, dashboard.today.occupancyPercent)}%` }"
                />
              </div>
              <p class="mt-1 text-xs text-muted">{{ dashboard.today.occupancyPercent }}% of total capacity</p>
            </dd>
          </div>
        </dl>
      </section>

      <section class="card lg:col-span-2">
        <h3 class="font-display text-lg font-semibold text-ink">Next 7 days — covers <span class="ml-1 text-xs font-normal text-muted">unfiltered</span></h3>
        <BarChart :rows="upcoming7Days" />
        <p v-if="dashboard.upcoming7.busiestSlot" class="mt-3 text-xs text-muted">
          Busiest slot: <strong>{{ dashboard.upcoming7.busiestSlot.time }}</strong> ({{ dashboard.upcoming7.busiestSlot.covers }} covers)
        </p>
      </section>

      <section class="card lg:col-span-3">
        <h3 class="font-display text-lg font-semibold text-ink">Next 30 days — covers per day <span class="ml-1 text-xs font-normal text-muted">unfiltered</span></h3>
        <p class="mt-1 text-xs text-muted">
          {{ dashboard.upcoming30.totalCovers }} covers · avg {{ Math.round(dashboard.upcoming30.totalCovers / 30) }}/day · peak {{ upcoming30Peak.covers }} on {{ describeDayLabel(upcoming30Peak.date, today) }}
        </p>
        <Sparkline class="mt-3" :values="upcoming30Covers" :height="120" />
        <div class="grid text-center text-[10px] leading-tight text-muted" style="grid-template-columns: repeat(30, minmax(0, 1fr))">
          <span
            v-for="(d, i) in dashboard.upcoming30.daysBreakdown"
            :key="d.date"
            class="py-1"
            :class="isMilestoneDay(d.date, i) ? '' : 'invisible lg:visible'"
            :title="`${describeDayLabel(d.date, today)}: ${d.covers} covers · ${d.bookings} bookings · ${d.fillPercent}% full`"
          >
            <span class="block font-medium text-ink">{{ d.covers }}</span>{{ new Date(d.date + 'T00:00:00').getDate() }}
          </span>
        </div>
      </section>

      <section class="card">
        <h3 class="font-display text-lg font-semibold text-ink">Guest mix <span class="ml-1 text-xs font-normal text-muted">{{ periodLabel }}</span></h3>
        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between"><dt class="text-muted">Total guests</dt><dd>{{ dashboard.guestMix.totalGuests }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">First-timers</dt><dd>{{ dashboard.guestMix.firstTimers }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">Repeats</dt><dd>{{ dashboard.guestMix.repeatGuests }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">Retention share</dt><dd><strong>{{ dashboard.guestMix.retentionShare }}%</strong></dd></div>
        </dl>
        <h4 class="mt-4 label">Occasions</h4>
        <BarChart :rows="occasionRows" color="rgb(var(--brand-sun))" />
        <h4 class="mt-4 label">Party size</h4>
        <BarChart :rows="partySizeRows" color="rgb(var(--brand-sand))" />
      </section>

      <section class="card">
        <h3 class="font-display text-lg font-semibold text-ink">Channel performance ({{ periodLabel }})</h3>
        <BarChart :rows="channelRows" />
        <p class="mt-3 text-xs text-muted">
          {{ dashboard.channel.totalBookings }} bookings · {{ dashboard.channel.totalCovers }} covers
        </p>
      </section>

      <section class="card">
        <h3 class="font-display text-lg font-semibold text-ink">Reliability ({{ periodLabel }})</h3>
        <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-muted">No-show rate</dt>
            <dd :class="['text-2xl font-semibold', dashboard.reliability.noShowRate > data.settings.noShowTargetPercent ? 'text-danger' : 'text-ink']">
              {{ dashboard.reliability.noShowRate }}%
            </dd>
            <p class="text-xs text-muted">Target ≤ {{ data.settings.noShowTargetPercent }}%</p>
          </div>
          <div>
            <dt class="text-muted">Cancellation rate</dt>
            <dd class="text-2xl font-semibold text-ink">{{ dashboard.reliability.cancellationRate }}%</dd>
          </div>
          <div>
            <dt class="text-muted">Avg lead time</dt>
            <dd class="text-lg text-ink">{{ formatLeadTime(dashboard.reliability.averageLeadTimeHours) }}</dd>
          </div>
          <div>
            <dt class="text-muted">Total realised</dt>
            <dd class="text-lg text-ink">{{ dashboard.reliability.totalRealised }}</dd>
          </div>
        </dl>
        <h4 class="mt-4 label">No-show rate trend</h4>
        <Sparkline :values="reliabilityValues" :height="80" color="rgb(var(--brand-sun))" fill="rgb(var(--brand-sun) / 0.12)" />
      </section>
    </div>
    <section class="card mt-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2"><h3 class="font-display text-lg font-semibold text-ink">Guest feedback</h3><span class="text-sm text-muted">{{ data.feedbackResponses.length }} responses · {{ feedbackAverage }}/5 average</span></div>
      <div v-if="data.feedbackResponses.length" class="mt-4 grid gap-4 md:grid-cols-2">
        <div><h4 class="label">Rating distribution</h4><BarChart :rows="feedbackDistribution" color="rgb(var(--brand-sun))" /></div>
        <div>
          <h4 class="label">Top tags</h4>
          <div class="mt-2 flex flex-wrap gap-1.5"><span v-for="[tag, n] in feedbackTags" :key="tag" class="rounded-full bg-line px-2.5 py-0.5 text-xs text-ink">{{ tag }} · {{ n }}</span></div>
        </div>
      </div>
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
          <div class="flex justify-between gap-3"><strong class="group-hover:text-accent">{{ guestName(response.guestId) }}</strong><span class="text-xs text-muted">{{ response.rating }}/5 · {{ new Date(response.submittedAt).toLocaleDateString() }}</span></div>
          <p v-if="response.comments" class="mt-1 text-ink">{{ response.comments }}</p>
          <div class="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p v-if="response.serviceTags.length" class="text-xs text-muted">{{ response.serviceTags.join(' · ') }}</p>
            <span class="text-xs font-medium text-accent underline underline-offset-2">View details →</span>
          </div>
        </article>
      </div>
      <p v-else class="mt-4 text-sm text-muted">No native feedback responses yet.</p>
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
              <p class="text-xs uppercase tracking-wide text-muted">Feedback detail</p>
              <h2 class="font-display text-2xl font-semibold text-ink">
                {{ guestOf(selectedFeedback.guestId)?.fullName ?? 'Guest feedback' }}
              </h2>
            </div>
            <button class="btn-ghost" type="button" @click="selectedFeedback = null">Close</button>
          </div>

          <div class="mt-4 space-y-4 text-sm">
            <div class="rounded-input bg-line/30 p-3">
              <div class="flex items-center justify-between">
                <span class="font-medium text-ink">Rating</span>
                <span class="text-lg font-bold text-accent">{{ selectedFeedback.rating }} / 5</span>
              </div>
              <div v-if="selectedFeedback.serviceTags?.length" class="mt-2">
                <span class="text-xs text-muted">Standout tags:</span>
                <div class="mt-1 flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in selectedFeedback.serviceTags"
                    :key="tag"
                    class="rounded-full bg-line px-2.5 py-0.5 text-xs text-ink"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="label">Comments</h4>
              <p
                class="mt-1 rounded-input bg-line/20 p-3 text-ink"
                :class="{ 'italic text-muted': !selectedFeedback.comments }"
              >
                {{ selectedFeedback.comments || 'No comments provided.' }}
              </p>
            </div>

            <div v-if="reservationOf(selectedFeedback.reservationId)" class="rounded-input border border-line p-3">
              <div class="flex items-center justify-between">
                <h4 class="label">Linked reservation</h4>
                <span class="font-mono text-xs text-muted">
                  {{ reservationOf(selectedFeedback.reservationId)!.bookingCode }}
                </span>
              </div>
              <dl class="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt class="text-muted">Date & time</dt>
                  <dd class="font-medium text-ink">
                    {{ reservationOf(selectedFeedback.reservationId)!.date }} · {{ reservationOf(selectedFeedback.reservationId)!.time }}
                  </dd>
                </div>
                <div>
                  <dt class="text-muted">Party & area</dt>
                  <dd class="font-medium text-ink">
                    {{ reservationOf(selectedFeedback.reservationId)!.partySize }} guests · {{ areaName(reservationOf(selectedFeedback.reservationId)!.seatingAreaId) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-muted">Source</dt>
                  <dd class="font-medium text-ink capitalize">
                    {{ reservationOf(selectedFeedback.reservationId)!.source }}
                  </dd>
                </div>
                <div v-if="reservationOf(selectedFeedback.reservationId)!.occasion">
                  <dt class="text-muted">Occasion</dt>
                  <dd class="font-medium text-ink">
                    {{ reservationOf(selectedFeedback.reservationId)!.occasion }}
                  </dd>
                </div>
              </dl>
            </div>

            <div v-if="guestOf(selectedFeedback.guestId)" class="flex items-center justify-between rounded-input bg-line/20 p-3">
              <div class="text-xs">
                <p class="font-medium text-ink">{{ guestOf(selectedFeedback.guestId)!.fullName }}</p>
                <p class="text-muted">{{ guestOf(selectedFeedback.guestId)!.phone }}</p>
              </div>
              <RouterLink
                :to="{ name: 'guest', params: { id: selectedFeedback.guestId } }"
                class="btn-primary !py-1.5 !px-3 !text-xs"
              >
                Open guest profile →
              </RouterLink>
            </div>

            <p class="text-right text-xs text-muted">
              Submitted {{ new Date(selectedFeedback.submittedAt).toLocaleString() }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
    <section class="card mt-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="font-display text-lg font-semibold text-ink">Filtered reservations</h3>
        <div class="flex flex-wrap items-center gap-2">
          <input v-model="search" type="search" class="field !w-56 !py-1.5 !px-3 text-sm" placeholder="Search name, code, phone" aria-label="Search reservations">
          <span class="text-sm text-muted">{{ searchedReservations.length }} matching</span>
          <button type="button" class="btn-secondary !min-h-9 !px-4" :disabled="!searchedReservations.length" @click="exportCSV">Export CSV</button>
        </div>
      </div>
      <div v-if="searchedReservations.length" class="mt-4 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead><tr class="border-b border-line text-muted"><th class="p-2">Date</th><th class="p-2">Guest</th><th class="p-2">Party</th><th class="p-2">Area</th><th class="p-2">Source</th><th class="p-2">Status</th></tr></thead>
          <tbody><tr v-for="reservation in searchedReservations.slice(0, 50)" :key="reservation.id" class="border-b border-line"><td class="p-2">{{ reservation.date }} {{ reservation.time }}</td><td class="p-2"><RouterLink :to="{ name: 'guest', params: { id: reservation.guestId } }" class="font-medium text-accent underline underline-offset-2">{{ guestName(reservation.guestId) }}</RouterLink><div class="text-xs text-muted">{{ reservation.bookingCode }}</div></td><td class="p-2">{{ reservation.partySize }}</td><td class="p-2">{{ areaName(reservation.seatingAreaId) }}</td><td class="p-2">{{ reservation.source }}</td><td class="p-2"><StatusChip :status="reservation.status" /></td></tr></tbody>
        </table>
        <p v-if="searchedReservations.length > 50" class="mt-2 text-xs text-muted">Showing first 50 reservations.</p>
      </div>
      <p v-else class="mt-4 text-sm text-muted">No reservations match these filters.</p>
    </section>
  </div>
</template>