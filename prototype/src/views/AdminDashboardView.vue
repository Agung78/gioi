<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { dashboardData, describeDayLabel } from '../domain/analytics'
import { todayISO, addDays } from '../domain/dates'
import BarChart from '../components/BarChart.vue'
import Sparkline from '../components/Sparkline.vue'

const data = useDataStore()
const today = todayISO()

const dashboard = computed(() => dashboardData(data.settings, data.reservations, data.guests, today))

const upcoming7Days = computed(() =>
  dashboard.value.upcoming7.daysBreakdown.map((d) => ({ label: describeDayLabel(d.date, today), value: d.covers, meta: `(${d.fillPercent}%)` })),
)
const upcoming30Days = computed(() =>
  dashboard.value.upcoming30.daysBreakdown.map((d) => ({ label: describeDayLabel(d.date, today), value: d.covers, meta: `(${d.fillPercent}%)` })),
)
const channelRows = computed(() =>
  dashboard.value.channel.rows.map((r) => ({ label: r.channel, value: r.covers, meta: `${r.bookings} bk · ${r.share}%` })),
)
const occasionRows = computed(() =>
  dashboard.value.guestMix.occasionMix.map((o) => ({ label: o.occasion, value: o.covers })),
)
const partySizeRows = computed(() =>
  dashboard.value.guestMix.partySizeMix.map((p) => ({ label: `${p.bucket} pax`, value: p.bookings })),
)

const reliabilityValues = computed(() => dashboard.value.reliability.byDay.map((d) => d.noShowRate))

const sparklineDates = computed(() =>
  dashboard.value.upcoming30.daysBreakdown.map((d) => d.covers),
)

const cueLabel: Record<string, string> = {
  slot_over_capacity: 'Slot over capacity',
  no_show_rate_high: 'No-show rate above target',
  cancellation_rate_high: 'Cancellation rate high',
  allergy_repeat_today: 'Allergy repeat guest today',
}
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
      <p class="text-sm text-gioi-moss/60">Live · last 30 days range</p>
    </header>

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
  </div>
</template>