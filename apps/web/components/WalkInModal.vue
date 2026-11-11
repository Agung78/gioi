<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Channel, PublicFloorPlan, StaffTableState } from '@gioi/domain'
import FloorPlanSvg from '@/components/FloorPlanSvg.vue'
import CountryCombobox from '@/components/CountryCombobox.vue'
import TimePicker from '@/components/TimePicker.vue'
import PhoneInput from '@/components/PhoneInput.vue'
import { todayISO } from '@gioi/domain'
import { createWalkIn, changeReservationStatus, fetchStaffTableAvailability } from '@/composables/useApi'

const props = defineProps<{
	open: boolean
	areas: Array<{ id: string; name: string }>
	venueSlug?: string
	venueId?: string
	date: string
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'created', reservationId: string): void
}>()

const closeOnEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => document.addEventListener('keydown', closeOnEsc))
onBeforeUnmount(() => document.removeEventListener('keydown', closeOnEsc))
// Earliest selectable time: now (rounded up to the picker step) when booking for today.
const minTime = computed(() => {
	if (!props.open || props.date !== todayISO()) return undefined
	const d = new Date()
	const m = Math.min(Math.ceil((d.getHours() * 60 + d.getMinutes()) / 5) * 5, 23 * 60 + 55)
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
})

const fullName = ref('')
const phone = ref('')
const partySize = ref(2)
const time = ref('19:00')
const seatingAreaId = ref('')
const occasion = ref('')
const source = ref<Channel>('walk_in')
const guestNotes = ref('')
const country = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)
const floorPlan = ref<PublicFloorPlan | null>(null)
// Chosen table indexes; all chosen tables share one seating area.
const chosen = ref<number[]>([])
const areaName = (id: string) => props.areas.find((a) => a.id === id)?.name
const onTablePick = (i: number) => {
	const t = floorPlan.value?.tables[i]
	if (!t) return
	if (chosen.value.includes(i)) { chosen.value = chosen.value.filter((j) => j !== i); return }
	// All picks must share one seating area: picking a table in another area replaces the selection.
	if (chosen.value.length > 0) {
		const area = floorPlan.value?.tables[chosen.value[0]!]?.seatingAreaId
		if (t.seatingAreaId !== area) { chosen.value = [i]; seatingAreaId.value = t.seatingAreaId; return }
	}
	chosen.value = [...chosen.value, i]
	seatingAreaId.value = t.seatingAreaId
}
const chosenTables = computed(() => chosen.value.flatMap((i) => floorPlan.value?.tables[i] ?? []))
const chosenTableIds = computed(() => chosenTables.value.flatMap((t) => t.id ?? []))
const totalSeats = computed(() => chosenTables.value.reduce((s, t) => s + t.seats, 0))
const seatsCoverParty = computed(() => chosen.value.length === 0 || totalSeats.value >= partySize.value)
const tableStates = ref<StaffTableState[]>([])
const stateOf = (i: number) => tableStates.value.find((s) => s.tableId === floorPlan.value?.tables[i]?.id)
// Held tables cannot be taken; late tables remain pickable (takeover).
const disabledIds = computed(() => tableStates.value.filter((s) => s.reason === 'held').map((s) => s.tableId))
const lateHolders = computed(() => chosenTables.value.flatMap((t) => {
	const s = tableStates.value.find((x) => x.tableId === t.id)
	return s?.reason === 'late' && s.holder ? [s.holder] : []
}))
const takeOver = computed(() => lateHolders.value.length > 0)
async function fetchTableAvailability() {
	if (!props.open || !props.venueId || !time.value || !partySize.value) { tableStates.value = []; return }
	try {
		tableStates.value = (await fetchStaffTableAvailability(props.venueId, { date: props.date, time: time.value, partySize: partySize.value })).tables
	} catch {
		tableStates.value = []
	}
}
watch([() => props.open, () => props.date, time, partySize], fetchTableAvailability)
watch(disabledIds, () => {
	chosen.value = chosen.value.filter((i) => !disabledIds.value.includes(floorPlan.value?.tables[i]?.id ?? ''))
})
// Switching to a different area drops the table choice.
watch(seatingAreaId, (a) => {
	if (chosen.value.length > 0) {
		const area = floorPlan.value?.tables[chosen.value[0]!]?.seatingAreaId
		if (area && area !== a) chosen.value = []
	}
})

watch(() => props.open, (val) => {
	if (val) {
		chosen.value = []
		if (props.venueSlug) $fetch<PublicFloorPlan>(`/api/public/venues/${props.venueSlug}/floor-plan`).then((p) => { floorPlan.value = p }).catch(() => { floorPlan.value = null })
		error.value = null
		fullName.value = ''
		phone.value = ''
		partySize.value = 2
		time.value = '19:00'
		seatingAreaId.value = ''
		occasion.value = ''
		source.value = 'walk_in'
		guestNotes.value = ''
		country.value = ''
	}
})

async function submit() {
	error.value = null
	if (!fullName.value.trim()) {
		error.value = 'Name is required.'
		return
	}
	if (chosen.value.length > 0 && !seatsCoverParty.value) {
		error.value = `Chosen tables seat ${totalSeats.value}, party needs ${partySize.value}.`
		return
	}
	submitting.value = true
	try {
		// API enforces capacity; empty area = best-fit auto assignment
		const r = await createWalkIn({
			guestName: fullName.value.trim(),
			phone: phone.value.trim() || undefined,
			date: props.date,
			time: time.value,
			partySize: partySize.value,
			seatingAreaId: seatingAreaId.value || undefined,
			tableIds: chosen.value.length ? chosenTableIds.value : undefined,
			takeOver: takeOver.value ? true : undefined,
			occasion: occasion.value.trim() || undefined,
			guestNotes: guestNotes.value.trim() || undefined,
			country: country.value.trim() || undefined,
			source: source.value,
		})
		// Auto-confirm walk-ins (Host accepts them on the spot)
		await changeReservationStatus(r.reservationId, { to: 'confirmed' })
		emit('created', r.reservationId)
		emit('close')
	} catch (e: any) {
		error.value = e.data?.message ?? (e.message || 'This slot cannot accommodate the party right now.')
		if (e.data?.message === 'table taken') { chosen.value = []; fetchTableAvailability() }
	} finally {
		submitting.value = false
	}
}
</script>

<template>
	<Transition name="modal">
	<div v-if="open" class="modal-backdrop fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/50 p-4" @click.self="emit('close')">
		<div class="modal-panel card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto">
			<div class="flex items-center justify-between">
				<h2 class="font-display text-xl font-semibold text-ink">Add walk-in <span class="text-base font-normal text-muted">· {{ date }}</span></h2>
				<button class="btn-ghost" type="button" @click="emit('close')">Close</button>
			</div>
			<form class="mt-4 space-y-3" @submit.prevent="submit">
				<div class="grid grid-cols-2 gap-3">
					<div class="col-span-2">
						<label class="label">Name *</label>
						<input v-model="fullName" required class="field" />
					</div>
					<div class="col-span-2">
						<label class="label" for="walkin-phone">Phone (optional)</label>
						<PhoneInput id="walkin-phone" v-model="phone" optional />
					</div>
					<div>
						<label class="label">Party size</label>
						<input v-model.number="partySize" type="number" min="1" max="20" class="field" />
					</div>
					<div>
						<label class="label" for="walkin-time">Time</label>
						<TimePicker id="walkin-time" v-model="time" :min="minTime" />
					</div>
					<div>
						<label class="label">Seating area</label>
						<select v-model="seatingAreaId" class="field">
							<option value="">Any available</option>
							<option v-for="a in areas" :key="a.id" :value="a.id">{{ a.name }}</option>
						</select>
					</div>
					<div>
						<label class="label">Source</label>
						<select v-model="source" class="field">
							<option value="walk_in">Walk-in</option>
							<option value="phone">Phone</option>
							<option value="whatsapp">WhatsApp</option>
							<option value="instagram">Instagram</option>
							<option value="google">Google</option>
						</select>
					</div>
					<div>
						<label class="label" for="walkin-country">Nationality (optional)</label>
						<CountryCombobox id="walkin-country" v-model="country" />
					</div>
					<div v-if="floorPlan?.tables.length" class="col-span-2">
						<FloorPlanSvg :plan="floorPlan" pickable :chosen="chosen" :selected="chosen.length ? `t:${chosen[0]}` : null" :disabled-ids="disabledIds"
							:highlight-area-id="seatingAreaId || null" label="Venue floor plan" @table-pick="onTablePick">
							<template #tooltip="{ index }">
								<strong>Table {{ index + 1 }} · {{ areaName(floorPlan.tables[index].seatingAreaId) }}</strong> · seats {{ floorPlan.tables[index].seats }}
								<template v-if="stateOf(index)?.holder"><br />{{ stateOf(index)!.holder!.guestName }} · {{ stateOf(index)!.holder!.time }}</template>
							</template>
						</FloorPlanSvg>
						<p class="mt-1.5 text-xs text-muted">Tap a table to pick it. Pick several to join them for a bigger party.</p>
						<p v-if="chosen.length" class="mt-1.5 text-xs text-muted">{{ chosen.length }} table{{ chosen.length === 1 ? '' : 's' }}, {{ totalSeats }} seat{{ totalSeats === 1 ? '' : 's' }} for {{ partySize }} pax</p>
						<div v-if="chosen.length && !seatsCoverParty" class="alert-warn mt-2 text-sm">Chosen tables seat {{ totalSeats }}, party needs {{ partySize }}.</div>
						<div v-if="lateHolders.length" class="alert-warn mt-2 text-sm">
							<template v-for="h in lateHolders" :key="h.reservationId">
								{{ h.guestName }} booked {{ h.time }} and hasn't arrived; taking this table marks {{ h.guestName }} as no-show.
							</template>
						</div>
					</div>
					<div class="col-span-2">
						<label class="label">Occasion</label>
						<input v-model="occasion" class="field" />
					</div>
					<div class="col-span-2">
						<label class="label">Notes</label>
						<textarea v-model="guestNotes" rows="2" class="field" />
					</div>
				</div>
				<div v-if="error" class="alert-danger">{{ error }}</div>
				<div class="flex justify-end gap-2">
					<button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
					<button type="submit" class="btn-primary" :disabled="submitting">
						{{ submitting ? 'Adding…' : 'Add walk-in' }}
					</button>
				</div>
			</form>
		</div>
	</div>
	</Transition>
</template>
