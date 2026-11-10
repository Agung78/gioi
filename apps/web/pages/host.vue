<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from '#app'
import { addDays, todayISO, type ReservationStatus } from '@gioi/domain'
import { PhWarning, PhWheelchair, PhStar, PhWhatsappLogo } from '@phosphor-icons/vue'
import StatusChip from '@/components/StatusChip.vue'
import StatusButtons from '@/components/StatusButtons.vue'
import GuestSearch from '@/components/GuestSearch.vue'
import DatePicker from '@/components/DatePicker.vue'
import WalkInModal from '@/components/WalkInModal.vue'
import ChangeTableModal from '@/components/ChangeTableModal.vue'
import {
	fetchDay,
	changeReservationStatus,
	exportDayCSV,
	type DayView,
	type StaffReservation,
} from '@/composables/useApi'

const router = useRouter()

const date = ref(todayISO())
const showWalkIn = ref(false)
const lastError = ref<string | null>(null)
const tab = ref<'today' | 'search'>('today')
const reservations = ref<StaffReservation[]>([])
const areas = ref<Array<{ id: string; name: string }>>([])
const venue = ref<{ slug: string; name: string; feedbackMessageTemplate: string } | null>(null)
const venueId = ref('')
const changing = ref<StaffReservation | null>(null)
const poll = ref<ReturnType<typeof setInterval> | null>(null)

async function load(day?: string) {
	lastError.value = null
	try {
		const d = await fetchDay(day)
		reservations.value = d.reservations
		areas.value = d.areas
		venue.value = d.venue
		venueId.value = d.venueId
	} catch (e: any) {
		lastError.value = e.message ?? 'Failed to load day.'
	}
}

async function exportCsv() {
	try {
		const url = URL.createObjectURL(await exportDayCSV(venueId.value, date.value))
		const a = document.createElement('a')
		a.href = url
		a.download = `gioi-reservations-${date.value}.csv`
		a.click()
		URL.revokeObjectURL(url)
	} catch (e: any) {
		lastError.value = e.message ?? 'Export failed.'
	}
}

watch(date, (v) => {
	load(v)
})

onMounted(() => {
	load(date.value)
	poll.value = setInterval(() => load(date.value), 4000)
})

onBeforeUnmount(() => {
	if (poll.value) clearInterval(poll.value)
})

const todays = computed(() => reservations.value)
const activeCount = computed(() =>
	todays.value.filter((r) => ['confirmed', 'arrived', 'seated', 'pending'].includes(r.status)).length,
)

async function changeStatus(r: StaffReservation, to: ReservationStatus) {
	lastError.value = null
	try {
		await changeReservationStatus(r.id, { to })
		await load(date.value)
	} catch (e: any) {
		lastError.value = e.message ?? 'Cannot change status.'
	}
}

// The guest page loads and reports its own errors; there is no route named 'guest' (Nuxt names it 'guests-id').
function openGuest(r: StaffReservation) {
	router.push(`/guests/${r.guestId}`)
}
function openGuestById(id: string) {
	if (id) router.push(`/guests/${id}`)
}

function guestOf(r: StaffReservation) {
	return {
		fullName: r.guestName,
		phone: r.guestPhone ?? null,
		allergies: r.allergies ?? [],
		accessibility: r.accessibility ?? null,
	}
}

function areaOf(r: StaffReservation) {
	return areas.value.find((a) => a.name === r.seatingArea)
}

function isAllergyAlert(r: StaffReservation): boolean {
	return (guestOf(r).allergies?.length ?? 0) > 0
}
function isAccessibilityAlert(r: StaffReservation): boolean {
	return !!guestOf(r).accessibility
}
function visitCount(guestId: string): number {
	return reservations.value.filter((r) => r.guestId === guestId && ['arrived', 'seated', 'completed'].includes(r.status)).length
}
function isRepeat(r: StaffReservation): boolean {
	return visitCount(r.guestId) > 1
}

function sendFeedback(r: StaffReservation) {
	const guest = guestOf(r)
	if (!guest.phone) {
		lastError.value = 'This guest does not have a valid phone number.'
		return
	}
	const phone = guest.phone.replace(/\D/g, '')
	if (!venue.value) return
	const feedbackUrl = `${window.location.origin}/${venue.value.slug}/feedback/${encodeURIComponent(r.bookingCode)}`
	const message = venue.value.feedbackMessageTemplate
		.replaceAll('{{guestName}}', guest.fullName)
		.replaceAll('{{restaurantName}}', venue.value.name)
		.replaceAll('{{feedbackUrl}}', feedbackUrl)
	window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
	lastError.value = null
}

function sendReminder(r: StaffReservation) {
	const guest = guestOf(r)
	const phone = guest.phone?.replace(/\D/g, '')
	if (!phone || !venue.value) {
		lastError.value = 'This guest does not have a valid phone number.'
		return
	}
	const message = `Hi ${guest.fullName}, this is a reminder of your reservation at ${venue.value.name} today at ${r.time} for ${r.partySize} ${r.partySize === 1 ? 'guest' : 'guests'} (ref ${r.bookingCode}). We look forward to seeing you!`
	window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
	lastError.value = null
}

function groupByTime(list: StaffReservation[]) {
	const map = new Map<string, StaffReservation[]>()
	for (const r of list) {
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
definePageMeta({ middleware: 'auth' })
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
				<DatePicker v-model="date" aria-label="Service date" class="min-h-12 !w-auto py-1.5 text-sm" />
				<button class="btn-ghost min-h-12" type="button" @click="date = addDays(date, 1)">Next</button>
				<button class="btn-ghost min-h-12" type="button" :disabled="!venueId" @click="exportCsv">Export CSV</button>
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
		<template v-if="tab === 'search'" key="search">
		<section class="card">
			<h2 class="font-display text-xl font-bold">Find a guest</h2>
			<p class="mt-1 text-sm text-muted">Search by name, phone, or email to see their visit history and notes.</p>
			<div class="mt-4">
				<GuestSearch @open="openGuestById" />
			</div>
		</section>
		</template>
		<template v-else key="today">
		<section>
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
											{{ guestOf(r).fullName }}
										</button>
										<span v-if="isRepeat(r)" class="chip bg-accent/15 text-accent"><PhStar :size="14" weight="fill" aria-hidden="true" /> Repeat</span>
									</div>
									<p class="text-sm text-muted">
										{{ r.partySize }} guests · {{ areaOf(r)?.name }} · {{ r.bookingCode }} · {{ r.source }}
									</p>
									<p v-if="r.occasion" class="mt-1 text-xs text-muted">{{ r.occasion }}</p>
								</div>
								<StatusChip :status="r.status as ReservationStatus" />
							</div>

							<div v-if="isAllergyAlert(r) || isAccessibilityAlert(r) || r.guestNotes || r.internalNotes" class="mt-3 space-y-2">
								<div v-if="isAllergyAlert(r)" class="alert-danger flex items-center gap-2 text-base font-semibold">
									<PhWarning :size="22" weight="fill" aria-hidden="true" /> Allergies: {{ guestOf(r).allergies.join(', ') }}
								</div>
								<div v-if="isAccessibilityAlert(r)" class="alert-warn flex items-center gap-2">
									<PhWheelchair :size="22" aria-hidden="true" /> <strong>Accessibility:</strong> {{ guestOf(r).accessibility }}
								</div>
								<div v-if="r.guestNotes" class="rounded-input bg-line/40 p-3 text-sm">
									<strong class="text-ink">Guest note:</strong> {{ r.guestNotes }}
								</div>
								<div v-if="r.internalNotes" class="rounded-input bg-line/40 p-3 text-sm">
									<strong class="text-ink">Internal:</strong> {{ r.internalNotes }}
								</div>
							</div>

							<div class="mt-4 flex flex-wrap items-center gap-3">
								<StatusButtons :reservation="r" @change="(to) => changeStatus(r, to as ReservationStatus)" />
								<button v-if="r.status === 'completed'" class="btn-ghost inline-flex items-center gap-2" type="button" @click="sendFeedback(r)">
									<PhWhatsappLogo :size="20" aria-hidden="true" /> Send feedback via WhatsApp
								</button>
								<button v-if="['pending', 'confirmed'].includes(r.status)" class="btn-ghost inline-flex items-center gap-2" type="button" @click="sendReminder(r)">
									<PhWhatsappLogo :size="20" aria-hidden="true" /> Send reminder via WhatsApp
								</button>
								<button v-if="['pending', 'confirmed', 'arrived', 'seated'].includes(r.status)" class="btn-ghost" type="button" @click="changing = r">Change table</button>
							</div>
						</article>
					</div>
				</div>
			</div>
		</section>
		</template>
	</Transition>


		<WalkInModal :open="showWalkIn" :areas="areas" :venue-slug="venue?.slug" :venue-id="venueId" :date="date" @close="showWalkIn = false" @created="lastError = null" />
		<ChangeTableModal :reservation="changing" :venue-id="venueId" :venue-slug="venue?.slug" :areas="areas" @close="changing = null" @saved="changing = null; load(date)" />
	</div>
</template>
