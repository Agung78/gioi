<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from '#app'
import { fetchAuditLog, type AuditEvent } from '@/composables/useApi'

const route = useRoute()
const venueId = route.query.venueId ? String(route.query.venueId) : undefined

const filter = ref<'all' | string>('all')
const { data: events, pending, error } = await useFetch<AuditEvent[]>('/api/admin/audit-log', {
	server: true,
	credentials: 'include',
	...(venueId ? { query: { venueId } } : {}),
})

const filtered = computed(() => {
	if (filter.value === 'all') return events.value ?? []
	return (events.value ?? []).filter((e) => e.entityType === filter.value)
})

function describe(e: AuditEvent): string {
	switch (e.action) {
		case 'reservation.created': return `Created reservation ${e.entityId}`
		case 'reservation.updated': return `Edited reservation ${e.entityId}`
		case 'reservation.status_changed': {
			const c = e.changes?.status
			return c ? `Status ${c.from} → ${c.to}` : `Status changed on ${e.entityId}`
		}
		case 'feedback_link.sent': return `Feedback WhatsApp link opened for ${e.entityId}`
		case 'seating_area.updated': return 'Seating areas updated'
		case 'user.updated': return 'Users updated'
		default: return e.action
	}
}

function fields(e: AuditEvent): string {
	if (!e.changes) return ''
	return Object.keys(e.changes).join(', ')
}
definePageMeta({ middleware: 'auth' })
</script>

<template>
	<div class="mx-auto max-w-5xl px-4 py-8">
		<header class="mb-6 flex flex-wrap items-baseline justify-between gap-3">
			<div>
				<p class="text-xs uppercase tracking-wide text-muted">Super Admin</p>
				<h1 class="font-display text-3xl font-semibold text-ink">Audit log</h1>
			</div>
			<select v-model="filter" class="field w-auto">
				<option value="all">All events</option>
				<option value="reservation">Reservations</option>
				<option value="reservation_status">Status changes</option>
				<option value="settings">Settings</option>
				<option value="seating_area">Seating areas</option>
				<option value="feedback_link">Feedback links</option>
			</select>
		</header>

		<div v-if="pending" class="card text-center py-16">
			<p class="text-muted">Loading…</p>
		</div>

		<div v-else-if="error" class="card text-center py-16">
			<p class="text-muted">Failed to load audit log.</p>
		</div>

		<div v-else-if="filtered.length === 0" class="card text-center text-muted">
			No audit events yet. Status changes and settings updates appear here as you make them.
		</div>

		<ol v-else class="card divide-y divide-line !p-0">
			<li v-for="e in filtered" :key="e.id" class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
				<div class="min-w-0">
					<p class="font-medium text-ink">{{ describe(e) }}</p>
					<p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
						<span class="chip bg-line/60 text-ink">{{ e.actor }}</span>
						<span class="uppercase tracking-wide">{{ e.entityType }}</span>
						<span v-if="fields(e)">· changed: {{ fields(e) }}</span>
						<span v-if="e.note">· {{ e.note }}</span>
					</p>
				</div>
				<time class="shrink-0 text-xs text-muted" :datetime="e.at">{{ new Date(e.at).toLocaleString() }}</time>
			</li>
		</ol>
	</div>
</template>
