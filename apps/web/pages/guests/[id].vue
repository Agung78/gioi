<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#app'
import { PhArrowLeft } from '@phosphor-icons/vue'
import { statusLabel } from '@gioi/domain'
import StatusChip from '@/components/StatusChip.vue'
import type { StaffGuest } from '@/composables/useApi'

const route = useRoute()
const id = String(route.params.id)

const { data: guest, pending, error } = await useFetch<StaffGuest>(`/api/staff/guests/${id}`, {
	server: true,
	credentials: 'include',
})

const visits = computed(() => {
	if (!guest.value) return []
	return [...guest.value.reservations].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
})
const completedCount = computed(() =>
	visits.value.filter((r) => ['completed', 'arrived', 'seated'].includes(r.status)).length,
)
const cancelledCount = computed(() => visits.value.filter((r) => r.status === 'cancelled').length)
const noShowCount = computed(() => visits.value.filter((r) => r.status === 'no_show').length)

function areaOf(id: string) {
	return { name: guest.value?.reservations.find((r) => r.id === id)?.seatingArea ?? id }
}
function feedbackOf(reservationId: string) {
	return guest.value?.reservations.find((r) => r.id === reservationId)?.feedback ?? null
}
definePageMeta({ middleware: 'auth' })
</script>

<template>
	<div class="mx-auto max-w-4xl px-4 py-8">
		<p class="text-sm"><NuxtLink to="/host" class="btn-ghost inline-flex min-h-11 items-center gap-1.5 !px-3 font-medium text-ink"><PhArrowLeft :size="18" aria-hidden="true" /> Back to host</NuxtLink></p>
		<div v-if="pending" class="card mt-4 text-center">
			<p class="text-muted">Loading…</p>
		</div>
		<div v-else-if="error || !guest" class="card mt-4">
			<p class="text-muted">Guest not found.</p>
		</div>
		<div v-else>
			<header class="card mt-4 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 class="font-display text-3xl font-semibold text-ink">{{ guest.fullName }}</h1>
					<p class="mt-1 text-sm text-muted">
						{{ guest.phone }}<span v-if="guest.email"> · {{ guest.email }}</span><span v-if="guest.country"> · {{ guest.country }}</span>
					</p>
					<p class="mt-1 text-xs text-muted">
						Guest since {{ new Date(guest.createdAt).toLocaleDateString() }} ·
						Marketing consent: <strong>{{ guest.marketingConsent ? 'yes' : 'no' }}</strong>
					</p>
				</div>
				<div class="text-right text-sm">
					<p class="font-semibold text-ink">{{ completedCount }} visits</p>
					<p class="text-muted">{{ cancelledCount }} cancelled · {{ noShowCount }} no-show</p>
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
				<h2 class="font-display text-xl font-semibold text-ink">Visit history</h2>
				<div v-if="visits.length === 0" class="mt-4 text-sm text-muted">No reservations yet.</div>
				<ul v-else class="mt-4 divide-y divide-line">
					<li v-for="r in visits" :key="r.id" class="py-3">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<div>
								<p class="font-medium text-ink">
									{{ new Date(r.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }}
									· {{ r.time }} · {{ r.partySize }} guest{{ r.partySize === 1 ? '' : 's' }}
								</p>
								<p class="text-xs text-muted">
									{{ areaOf(r.id).name }} · {{ r.source }} · {{ r.bookingCode }}
									<span v-if="r.occasion"> · {{ r.occasion }}</span>
								</p>
							</div>
							<StatusChip :status="r.status as any" />
						</div>
						<div v-if="feedbackOf(r.id)" class="mt-2 rounded bg-line/40 p-2.5 text-xs">
							<div class="flex items-center justify-between font-medium text-ink">
								<span>Guest feedback: {{ feedbackOf(r.id)!.rating }}/5</span>
								<span class="text-muted">{{ new Date(feedbackOf(r.id)!.submittedAt).toLocaleDateString() }}</span>
							</div>
							<p v-if="feedbackOf(r.id)!.comments" class="mt-1 text-ink">{{ feedbackOf(r.id)!.comments }}</p>
							<p v-if="feedbackOf(r.id)!.serviceTags.length" class="mt-0.5 text-muted">
								Stood out: {{ feedbackOf(r.id)!.serviceTags.join(' · ') }}
							</p>
						</div>
					</li>
				</ul>
			</section>
		</div>
	</div>
</template>
