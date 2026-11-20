<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from '#app'
import { addDays, statusLabel, todayISO, type PublicFloorPlan, type ReservationStatus } from '@gioi/domain'
import { PhWarning, PhWheelchair, PhStar, PhWhatsappLogo, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import StatusChip from '@/components/StatusChip.vue'
import StatusButtons from '@/components/StatusButtons.vue'
import GuestSearch from '@/components/GuestSearch.vue'
import DatePicker from '@/components/DatePicker.vue'
import WalkInModal from '@/components/WalkInModal.vue'
import ChangeTableModal from '@/components/ChangeTableModal.vue'
import EditPhoneModal from '@/components/EditPhoneModal.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import {
	fetchDay,
	changeReservationStatus,
	undoReservationStatus,
	fetchDayExport,
	updateGuestPhone,
	type DayView,
	type StaffReservation,
} from '@/composables/useApi'

const router = useRouter()
const auth = useAuthStore()
const { toast } = useToast()

const date = ref(todayISO())
const showWalkIn = ref(false)
const lastError = ref<string | null>(null)
const tab = ref<'today' | 'search'>('today')
const reservations = ref<StaffReservation[]>([])
const areas = ref<Array<{ id: string; name: string }>>([])
const venue = ref<{ slug: string; name: string; feedbackMessageTemplate: string } | null>(null)
const venueId = ref('')
const floorPlan = ref<PublicFloorPlan | null>(null)
const statusFilter = ref<'all' | ReservationStatus>('all')
const changing = ref<StaffReservation | null>(null)
const poll = ref<ReturnType<typeof setInterval> | null>(null)

async function load(day?: string) {
	lastError.value = null
	if (auth.isSuperAdmin && !auth.selectedVenueId) return // wait for the super admin to pick a venue
	try {
		const d = await fetchDay(day, auth.isSuperAdmin ? auth.selectedVenueId ?? undefined : undefined)
		reservations.value = d.reservations
		areas.value = d.areas
		venue.value = d.venue
		venueId.value = d.venueId
	} catch (e: any) {
		lastError.value = e.message ?? 'Failed to load day.'
	}
}


const showExport = ref(false)
const exportColumns = ref<string[]>([])
const exportRows = ref<unknown[][]>([])
const exportFilename = ref('')

async function exportCsv() {
	try {
		const { columns, rows } = await fetchDayExport(venueId.value, date.value)
		exportColumns.value = columns
		exportRows.value = rows
		exportFilename.value = `gioi-reservations-${date.value}.csv`
		showExport.value = true
	} catch (e: any) {
		lastError.value = e.message ?? 'Export failed.'
	}
}

watch(date, (v) => {
	load(v)
})

watch(() => auth.selectedVenueId, (id) => {
	if (auth.isSuperAdmin && id) load(date.value)
})


onMounted(() => {
	load(date.value)
	// 15s and only while visible: each poll hits Neon, which bills per CU-hour awake.
	poll.value = setInterval(() => { if (!document.hidden) load(date.value) }, 15000)
})

onBeforeUnmount(() => {
	if (poll.value) clearInterval(poll.value)
})
watch(
	() => venue.value?.slug,
	(slug) => {
		if (!slug) {
			floorPlan.value = null
			return
		}
		$fetch<PublicFloorPlan>(`/api/public/venues/${slug}/floor-plan`)
			.then((p) => { floorPlan.value = p })
			.catch(() => { floorPlan.value = null })
	},
)

const todays = computed(() => reservations.value)
const sourceFilter = ref('all')
const shown = computed(() => todays.value.filter((r) => (statusFilter.value === 'all' || r.status === statusFilter.value) && (sourceFilter.value === 'all' || r.source === sourceFilter.value)))
const activeCount = computed(() =>
	todays.value.filter((r) => ['confirmed', 'arrived', 'seated', 'pending'].includes(r.status)).length,
)

async function changeStatus(r: StaffReservation, to: ReservationStatus) {
	lastError.value = null
	try {
		await changeReservationStatus(r.id, { to })
		await load(date.value)
		if (to !== 'cancelled' && to !== 'no_show') toast(`${guestOf(r).fullName} · ${statusLabel(to)}`, 'success', { label: 'Undo', run: () => undo(r.id) })
	} catch (e: any) {
		lastError.value = e.message ?? 'Cannot change status.'
	}
}

async function undo(id: string) {
	lastError.value = null
	try {
		await undoReservationStatus(id)
		await load(date.value)
		toast('Change undone')
	} catch (e: any) {
		lastError.value = e.message ?? 'Cannot undo.'
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
function isRepeat(r: StaffReservation): boolean {
	return r.isRepeat
}

function feedbackWaUrl(r: StaffReservation, rawPhone: string): string {
	const venueInfo = venue.value!
	const feedbackUrl = `${window.location.origin}/${venueInfo.slug}/feedback/${encodeURIComponent(r.bookingCode)}`
	const message = venueInfo.feedbackMessageTemplate
		.replaceAll('{{guestName}}', guestOf(r).fullName)
		.replaceAll('{{restaurantName}}', venueInfo.name)
		.replaceAll('{{feedbackUrl}}', feedbackUrl)
	return `https://wa.me/${rawPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

function sendFeedback(r: StaffReservation) {
	const phone = guestOf(r).phone
	if (!phone || !venue.value) {
		lastError.value = 'This guest does not have a valid phone number.'
		return
	}
	window.open(feedbackWaUrl(r, phone), '_blank', 'noopener,noreferrer')
	lastError.value = null
}

// Frontliner adds/edits the guest's number; on a completed reservation, also opens WhatsApp with the feedback link.
const editingPhone = ref<StaffReservation | null>(null)
const phoneSaving = ref(false)
const phoneError = ref<string | null>(null)
function askPhone(r: StaffReservation) {
	editingPhone.value = r
	phoneError.value = null
}
async function savePhone(phone: string) {
	const r = editingPhone.value
	if (!r) return
	if (phone.replace(/\D/g, '').length < 6) {
		phoneError.value = 'Enter a valid phone number.'
		return
	}
	phoneSaving.value = true
	phoneError.value = null
	// Open the tab inside the click (Safari/iPad block popups opened after an await), point it at WhatsApp once saved.
	const wa = r.status === 'completed' ? window.open('', '_blank') : null
	try {
		await updateGuestPhone(r.guestId, phone)
		if (wa && venue.value) wa.location.href = feedbackWaUrl(r, phone)
		editingPhone.value = null
		toast(r.status === 'completed' ? 'Phone saved · opening WhatsApp' : 'Phone saved')
		await load(date.value)
	} catch (e: any) {
		wa?.close()
		phoneError.value = e.data?.message ?? (e.message || 'Could not save phone number.')
	} finally {
		phoneSaving.value = false
	}
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
function tableLabel(r: StaffReservation) {
	const plan = floorPlan.value
	if (r.tableIds.length === 0 || !plan) return 'No table'
	const nums = r.tableIds.flatMap((id) => {
		const n = plan.tables.findIndex((t) => t.id === id) + 1
		return n > 0 ? [n] : []
	})
	if (nums.length === 0) return 'No table'
	return `${nums.length === 1 ? 'Table' : 'Tables'} ${nums.join(' + ')}`
}
definePageMeta({ middleware: 'auth' })
</script>

<template>
	<div class="mx-auto max-w-6xl px-4 pb-8">
		<!-- Whole toolbar stays pinned under the app header. -->
		<div class="sticky top-[var(--app-header-h,3.6rem)] z-20 -mx-4 mb-4 border-b border-line bg-surface px-4 pt-3 md:flex md:flex-wrap md:items-end md:pt-4">
			<div class="md:flex md:w-full md:items-center md:justify-between md:mb-3 md:gap-4">
			<header class="mb-2 md:mb-0 flex flex-wrap items-baseline gap-x-3">
				<h1 class="font-display text-lg font-extrabold md:text-xl">
					{{ new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}
				</h1>
				<p class="text-sm text-muted">{{ todays.length }} bookings · {{ activeCount }} active</p>
			</header>
			<div class="flex items-center gap-2">
				<button class="btn-secondary min-h-11 !px-3" type="button" aria-label="Previous day" @click="date = addDays(date, -1)"><PhCaretLeft :size="20" aria-hidden="true" /></button>
				<DatePicker v-model="date" aria-label="Service date" class="min-h-11 min-w-0 flex-1 py-1.5 text-sm md:!w-auto md:min-w-[11rem] md:flex-none" />
				<button class="btn-secondary min-h-11 !px-3" type="button" aria-label="Next day" @click="date = addDays(date, 1)"><PhCaretRight :size="20" aria-hidden="true" /></button>
				<button class="btn-secondary min-h-11" type="button" :disabled="date === todayISO()" @click="date = todayISO()">Today</button>
			</div>
			</div>
		<div v-if="tab === 'today'" class="mb-1 mt-3 flex flex-wrap items-center gap-2 md:order-2 md:my-0 md:ml-auto md:pb-2">
			<button class="btn-primary min-h-12 md:min-h-11 flex-1 md:flex-none" type="button" @click="showWalkIn = true">+ Walk-in</button>
			<button class="btn-secondary min-h-12 md:min-h-11 flex-1 md:flex-none" type="button" :disabled="!venueId" @click="exportCsv">Export CSV</button>
			<Transition name="modal"><ExportViewer v-if="showExport" :columns="exportColumns" :rows="exportRows" :filter-summary="`Date: ${date}`" :filename="exportFilename" @close="showExport = false" /></Transition>
			<template v-if="todays.length">
				<select v-model="statusFilter" aria-label="Status" class="field min-h-12 md:min-h-11 !w-auto min-w-0 flex-1 !px-3 text-sm text-ink md:flex-none">
					<option value="all">All statuses</option>
					<option value="pending">Pending</option>
					<option value="confirmed">Confirmed</option>
					<option value="arrived">Arrived</option>
					<option value="seated">Seated</option>
					<option value="completed">Completed</option>
					<option value="no_show">No-show</option>
					<option value="cancelled">Cancelled</option>
				</select>
				<select v-model="sourceFilter" aria-label="Source" class="field min-h-12 md:min-h-11 !w-auto min-w-0 flex-1 !px-3 text-sm text-ink md:flex-none">
					<option value="all">All sources</option>
					<option v-for="s in ['website', 'instagram', 'google', 'whatsapp', 'walk_in', 'phone', 'host']" :key="s" :value="s">{{ s }}</option>
				</select>
			</template>
		</div>
			<nav class="flex gap-6 md:order-1">
				<button
					v-for="t in [{ id: 'today', label: 'Today\'s service' }, { id: 'search', label: 'Guest search' }] as const"
					:key="t.id"
					class="-mb-px min-h-11 border-b-2 text-base font-medium"
					:class="tab === t.id ? 'border-ink text-ink' : 'border-transparent text-muted'"
					type="button"
					@click="tab = t.id"
				>
					{{ t.label }}
				</button>
			</nav>
		</div>
		<div v-if="lastError" class="alert-danger mb-4">{{ lastError }}</div>

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
				<p v-if="shown.length === 0" class="text-muted">No bookings match these filters.</p>
				<div v-for="group in groupByTime(shown)" :key="group.time">
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
										{{ r.partySize }} guests · {{ areaOf(r)?.name }} · <strong class="text-ink">{{ tableLabel(r) }}</strong> · {{ r.bookingCode }} · {{ r.source }}
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
								<button v-if="r.status === 'completed' && guestOf(r).phone" class="btn-secondary inline-flex items-center gap-2" type="button" @click="sendFeedback(r)">
									<PhWhatsappLogo :size="20" aria-hidden="true" /> Send feedback via WhatsApp
								</button>
								<button class="btn-secondary" type="button" @click="askPhone(r)">
									{{ guestOf(r).phone ? 'Edit phone' : 'Add phone' }}
								</button>
								<button v-if="['pending', 'confirmed'].includes(r.status) && guestOf(r).phone" class="btn-secondary inline-flex items-center gap-2" type="button" @click="sendReminder(r)">
									<PhWhatsappLogo :size="20" aria-hidden="true" /> Send reminder via WhatsApp
								</button>
								<button v-if="['pending', 'confirmed', 'arrived', 'seated'].includes(r.status)" class="btn-secondary" type="button" @click="changing = r">Change table</button>
							</div>
						</article>
					</div>
				</div>
			</div>
		</section>
		</template>
	</Transition>


		<WalkInModal :open="showWalkIn" :areas="areas" :venue-id="venueId" :date="date" :floor-plan="floorPlan" @close="showWalkIn = false" @created="lastError = null; toast('Reservation created')" />
		<ChangeTableModal :reservation="changing" :venue-id="venueId" :areas="areas" :floor-plan="floorPlan" @close="changing = null" @saved="changing = null; load(date); toast('Table changed')" />
		<EditPhoneModal :reservation="editingPhone" :saving="phoneSaving" :error="phoneError" @close="editingPhone = null" @save="savePhone" />
	</div>
</template>
