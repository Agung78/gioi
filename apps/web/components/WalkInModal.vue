<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { todayISO } from '@gioi/domain'
import type { Channel, PublicFloorPlan, StaffTableState } from '@gioi/domain'
import FloorPlanSvg from '@/components/FloorPlanSvg.vue'
import { createWalkIn, changeReservationStatus, fetchStaffTableAvailability } from '@/composables/useApi'

const props = defineProps<{
	open: boolean
	areas: Array<{ id: string; name: string }>
	venueSlug?: string
	venueId?: string
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'created', reservationId: string): void
}>()

const closeOnEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => document.addEventListener('keydown', closeOnEsc))
onBeforeUnmount(() => document.removeEventListener('keydown', closeOnEsc))

const fullName = ref('')
const phone = ref('')
const partySize = ref(2)
const time = ref('19:00')
const seatingAreaId = ref('')
const occasion = ref('')
const source = ref<Channel>('walk_in')
const guestNotes = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)
const floorPlan = ref<PublicFloorPlan | null>(null)
const chosenIdx = ref<number | null>(null) // table last clicked; booking itself is by area
const chosen = computed(() => (seatingAreaId.value && chosenIdx.value != null && floorPlan.value?.tables[chosenIdx.value]?.seatingAreaId === seatingAreaId.value ? chosenIdx.value : null))
const areaName = (id: string) => props.areas.find((a) => a.id === id)?.name
const onTablePick = (i: number) => {
	const t = floorPlan.value?.tables[i]
	if (!t) return
	const clear = chosen.value === i
	seatingAreaId.value = clear ? '' : t.seatingAreaId
	chosenIdx.value = clear ? null : i
}
const chosenTableId = computed(() => (chosen.value != null ? floorPlan.value?.tables[chosen.value]?.id : undefined))

const tableStates = ref<StaffTableState[]>([])
// small/held tables are not pickable; late ones are (takeover)
const unavailableTableIds = computed(() => tableStates.value.filter((s) => s.reason !== 'late').map((s) => s.tableId))
const stateOf = (i: number) => tableStates.value.find((s) => s.tableId === floorPlan.value?.tables[i]?.id)
const lateHolder = computed(() => {
	const s = chosenTableId.value ? tableStates.value.find((x) => x.tableId === chosenTableId.value) : undefined
	return s?.reason === 'late' ? s.holder : undefined
})
async function fetchTableAvailability() {
	if (!props.open || !props.venueId || !time.value || !partySize.value) { tableStates.value = []; return }
	try {
		tableStates.value = (await fetchStaffTableAvailability(props.venueId, { date: todayISO(), time: time.value, partySize: partySize.value })).tables
	} catch {
		tableStates.value = []
	}
}
watch([() => props.open, time, partySize], fetchTableAvailability)
watch(unavailableTableIds, (ids) => {
	if (chosenTableId.value && ids.includes(chosenTableId.value)) chosenIdx.value = null
})
// Switching to a different area drops the table choice.
watch(seatingAreaId, (a) => {
	if (chosenIdx.value != null && floorPlan.value?.tables[chosenIdx.value]?.seatingAreaId !== a) chosenIdx.value = null
})

watch(() => props.open, (val) => {
	if (val) {
		chosenIdx.value = null
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
	}
})

async function submit() {
	error.value = null
	if (!fullName.value.trim() || !phone.value.trim()) {
		error.value = 'Name and phone are required.'
		return
	}
	submitting.value = true
	try {
		// API enforces capacity; empty area = best-fit auto assignment
		const r = await createWalkIn({
			guestName: fullName.value.trim(),
			phone: phone.value.trim(),
			date: todayISO(),
			time: time.value,
			partySize: partySize.value,
			seatingAreaId: seatingAreaId.value || undefined,
			tableId: chosenTableId.value,
			takeOver: lateHolder.value ? true : undefined,
			occasion: occasion.value.trim() || undefined,
			guestNotes: guestNotes.value.trim() || undefined,
			source: source.value,
		})
		// Auto-confirm walk-ins (Host accepts them on the spot)
		await changeReservationStatus(r.reservationId, { to: 'confirmed' })
		emit('created', r.reservationId)
		emit('close')
	} catch (e: any) {
		error.value = e.data?.message ?? (e.message || 'This slot cannot accommodate the party right now.')
		if (e.data?.message === 'table taken') { chosenIdx.value = null; fetchTableAvailability() }
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
				<h2 class="font-display text-xl font-semibold text-ink">Add walk-in</h2>
				<button class="btn-ghost" type="button" @click="emit('close')">Close</button>
			</div>
			<form class="mt-4 space-y-3" @submit.prevent="submit">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label">Name *</label>
						<input v-model="fullName" required class="field" />
					</div>
					<div>
						<label class="label">Phone *</label>
						<input v-model="phone" required class="field" />
					</div>
					<div>
						<label class="label">Party size</label>
						<input v-model.number="partySize" type="number" min="1" max="20" class="field" />
					</div>
					<div>
						<label class="label">Time</label>
						<input v-model="time" type="time" class="field" />
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
					<div v-if="floorPlan?.tables.length" class="col-span-2">
						<FloorPlanSvg :plan="floorPlan" pickable :chosen="chosen" :selected="chosen != null ? `t:${chosen}` : null" :disabled-ids="unavailableTableIds"
							:highlight-area-id="seatingAreaId || null" label="Venue floor plan" @table-pick="onTablePick">
							<template #tooltip="{ index }">
								<strong>{{ areaName(floorPlan.tables[index].seatingAreaId) }}</strong> · seats {{ floorPlan.tables[index].seats }}
								<template v-if="stateOf(index)?.holder"><br />{{ stateOf(index)!.holder!.guestName }} · {{ stateOf(index)!.holder!.time }}</template>
							</template>
						</FloorPlanSvg>
						<p class="mt-1.5 text-xs text-muted">Tap a table to pick its area.</p>
						<div v-if="lateHolder" class="alert-warn mt-2 text-sm">
							{{ lateHolder.guestName }} booked this table at {{ lateHolder.time }} and hasn't arrived. Adding this walk-in marks that reservation as no-show.
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
