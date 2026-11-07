<script setup lang="ts">
import { computed, ref } from 'vue'
import { todayISO } from '@gioi/domain'
import { statusLabel } from '@gioi/domain'
import StatusChip from '@/components/StatusChip.vue'
import BarChart from '@/components/BarChart.vue'
import Sparkline from '@/components/Sparkline.vue'
import { fetchAdminDashboard, fetchAuditLog, type AdminDashboard, type AuditEvent } from '@/composables/useApi'

const today = todayISO()
const preset = ref<'today' | 'last7' | 'last30' | 'custom'>('last30')
const filters = ref({
	rangeStart: today,
	rangeEnd: today,
	status: 'all' as string,
	source: 'all' as string,
	seatingAreaId: 'all' as string,
	occasion: 'all' as string,
})

const { data: dashboard, pending, error } = await useFetch<AdminDashboard>('/api/admin/dashboard', {
	server: true,
	credentials: 'include',
})

const { data: audit } = await useFetch<AuditEvent[]>('/api/admin/audit-log', {
	server: true,
	credentials: 'include',
})

const statusOptions: string[] = ['pending', 'confirmed', 'arrived', 'seated', 'completed', 'cancelled', 'no_show']

function setPreset(next: typeof preset.value) {
	preset.value = next
	if (next === 'today') { filters.value.rangeStart = today; filters.value.rangeEnd = today }
	else if (next === 'last7') { filters.value.rangeStart = today; filters.value.rangeEnd = today }
	else if (next === 'last30') { filters.value.rangeStart = today; filters.value.rangeEnd = today }
}

const rangeLabel = computed(() => `${filters.value.rangeStart} → ${filters.value.rangeEnd}`)
const periodLabel = computed(() => ({ today: 'today', last7: 'last 7 days', last30: 'last 30 days', custom: rangeLabel.value })[preset.value])
const search = ref('')
const asOf = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const describeDayLabel = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString()
const statusOptionsLabels = statusOptions
definePageMeta({ middleware: 'auth' })
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
			<label class="label">Range
				<select v-model="preset" class="field mt-1 !py-1.5 !px-3 text-sm" @change="setPreset(preset)">
					<option value="today">Today</option>
					<option value="last7">Last 7 days</option>
					<option value="last30">Last 30 days</option>
					<option value="custom">Custom</option>
				</select>
			</label>
			<label v-if="preset === 'custom'" class="label">From
				<input v-model="filters.rangeStart" type="date" class="field mt-1 !py-1.5 !px-3 text-sm">
			</label>
			<label v-if="preset === 'custom'" class="label">To
				<input v-model="filters.rangeEnd" type="date" class="field mt-1 !py-1.5 !px-3 text-sm">
			</label>
			<label class="label">Status
				<select v-model="filters.status" class="field mt-1 !py-1.5 !px-3 text-sm">
					<option value="all">All statuses</option>
					<option v-for="status in statusOptionsLabels" :key="status" :value="status">{{ statusLabel(status as any) }}</option>
				</select>
			</label>
			<label class="label">Source
				<select v-model="filters.source" class="field mt-1 !py-1.5 !px-3 text-sm">
					<option value="all">All sources</option>
				</select>
			</label>
			<label class="label">Area
				<select v-model="filters.seatingAreaId" class="field mt-1 !py-1.5 !px-3 text-sm">
					<option value="all">All areas</option>
				</select>
			</label>
			<label class="label">Occasion
				<select v-model="filters.occasion" class="field mt-1 !py-1.5 !px-3 text-sm">
					<option value="all">All occasions</option>
				</select>
			</label>
			<p class="text-xs text-muted md:col-span-3 lg:col-span-6">
				Filters apply to period analytics ({{ periodLabel }}).
			</p>
		</section>

		<section v-if="dashboard && dashboard.bookings !== undefined" class="mb-6 space-y-2">
			<h2 class="font-display text-lg font-semibold text-ink">Action cues</h2>
			<ul class="space-y-1.5">
				<li v-if="dashboard.noShows > 0" class="alert-warn">
					<strong>No-shows today:</strong> {{ dashboard.noShows }}
					<NuxtLink to="/host" class="ml-2 font-medium underline underline-offset-2">Open host view →</NuxtLink>
				</li>
				<li v-else-if="dashboard.cancellations > 0" class="alert-warn">
					<strong>Cancellations today:</strong> {{ dashboard.cancellations }}
				</li>
				<li v-else class="text-sm text-muted">No action cues today.</li>
			</ul>
		</section>

		<div class="grid gap-4 lg:grid-cols-3">
			<section class="card">
				<h3 class="font-display text-lg font-semibold text-ink">Today live <span class="ml-1 text-xs font-normal text-muted">unfiltered</span></h3>
				<dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
					<div><dt class="text-muted">Bookings</dt><dd class="text-2xl font-semibold text-ink">{{ dashboard?.bookings ?? 0 }}</dd></div>
					<div><dt class="text-muted">Expected covers</dt><dd class="text-2xl font-semibold text-ink">{{ dashboard?.expectedCovers ?? 0 }}</dd></div>
					<div><dt class="text-muted">Arrived</dt><dd class="text-lg text-ink">{{ dashboard?.arrivedCovers ?? 0 }}</dd></div>
					<div><dt class="text-muted">Seated</dt><dd class="text-lg text-ink">{{ dashboard?.seatedCovers ?? 0 }}</dd></div>
					<div><dt class="text-muted">Completed</dt><dd class="text-lg text-ink">{{ dashboard?.completedCovers ?? 0 }}</dd></div>
					<div><dt class="text-muted">No-shows / cancellations</dt><dd class="text-lg text-ink">{{ dashboard?.noShows ?? 0 }} / {{ dashboard?.cancellations ?? 0 }}</dd></div>
					<div class="col-span-2 mt-2">
						<dt class="text-muted">Capacity fill</dt>
						<dd class="mt-1">
							<div class="h-3 w-full overflow-hidden rounded bg-line/40">
								<div class="h-full rounded bg-accent transition-all" :style="{ width: '0%' }" />
							</div>
							<p class="mt-1 text-xs text-muted">0% of total capacity</p>
						</dd>
					</div>
				</dl>
			</section>

			<section class="card lg:col-span-2">
				<h3 class="font-display text-lg font-semibold text-ink">Today by status <span class="ml-1 text-xs font-normal text-muted">unfiltered</span></h3>
				<dl class="mt-4 space-y-2 text-sm">
					<div v-for="(count, status) in dashboard?.byStatus ?? {}" :key="status" class="flex justify-between">
						<dt class="text-muted">{{ statusLabel(status as any) }}</dt>
						<dd class="font-semibold text-ink">{{ count }}</dd>
					</div>
					<div v-if="!(dashboard?.byStatus) || Object.keys(dashboard.byStatus).length === 0" class="text-sm text-muted">No bookings today.</div>
				</dl>
			</section>

			<section class="card lg:col-span-3">
				<h3 class="font-display text-lg font-semibold text-ink">Recent audit <span class="ml-1 text-xs font-normal text-muted">unfiltered</span></h3>
				<div v-if="audit && audit.length" class="mt-4 space-y-3">
					<article v-for="e in audit.slice(0, 10)" :key="e.id" class="p-3 rounded-input bg-line/30 text-sm">
						<p class="font-medium text-ink">{{ e.action }}</p>
						<p class="text-xs text-muted">{{ e.actor }} · {{ e.entityType }} · {{ new Date(e.at).toLocaleString() }}</p>
					</article>
				</div>
				<div v-else class="mt-4 text-sm text-muted">No audit events yet.</div>
			</section>
		</div>
	</div>
</template>
