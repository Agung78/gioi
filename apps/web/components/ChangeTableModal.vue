<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { hasRedundantTable, type PublicFloorPlan, type StaffTableState } from '@gioi/domain'
import FloorPlanSvg from '@/components/FloorPlanSvg.vue'
import { fetchStaffTableAvailability, updateReservation, type StaffReservation } from '@/composables/useApi'

const props = defineProps<{
	reservation: StaffReservation | null
	venueId: string
	venueSlug?: string
	areas: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'saved'): void
}>()

const closeOnEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && props.reservation) emit('close') }
onMounted(() => document.addEventListener('keydown', closeOnEsc))
onBeforeUnmount(() => document.removeEventListener('keydown', closeOnEsc))

const floorPlan = ref<PublicFloorPlan | null>(null)
const states = ref<StaffTableState[]>([])
const chosen = ref<number[]>([])
const error = ref<string | null>(null)
const submitting = ref(false)

const areaName = (id: string) => props.areas.find((a) => a.id === id)?.name
const stateOf = (i: number) => states.value.find((s) => s.tableId === floorPlan.value?.tables[i]?.id)
const onPick = (i: number) => {
	if (chosen.value.includes(i)) { chosen.value = chosen.value.filter((j) => j !== i); return }
	// All picks must share one seating area: picking a table in another area replaces the selection.
	if (chosen.value.length > 0) {
		const area = floorPlan.value?.tables[chosen.value[0]]?.seatingAreaId
		if (floorPlan.value?.tables[i]?.seatingAreaId !== area) { chosen.value = [i]; return }
	}
	const seats = floorPlan.value?.tables[i]?.seats ?? 0
	if (hasRedundantTable([...chosenTables.value.map((c) => c.seats), seats], props.reservation?.partySize ?? 0)) { error.value = `Tables already seat ${totalSeats.value} for ${props.reservation?.partySize} pax. Deselect one to swap.`; return }
	error.value = null
	chosen.value = [...chosen.value, i]
}
const chosenTables = computed(() => chosen.value.flatMap((i) => floorPlan.value?.tables[i] ?? []))
const chosenTableIds = computed(() => chosenTables.value.flatMap((t) => t.id ?? []))
const totalSeats = computed(() => chosenTables.value.reduce((s, t) => s + t.seats, 0))
const seatsCoverParty = computed(() => chosen.value.length === 0 || totalSeats.value >= (props.reservation?.partySize ?? 0))
const changed = computed(() => [...chosenTableIds.value].sort().join(',') !== [...(props.reservation?.tableIds ?? [])].sort().join(','))
// Takeover is walk-in only, so every state (held/late) is disabled here.
const disabledIds = computed(() => states.value.map((s) => s.tableId))
const saveEnabled = computed(() => changed.value && seatsCoverParty.value && chosen.value.length > 0)

function selectCurrent() {
	const ids = props.reservation?.tableIds ?? []
	chosen.value = ids.flatMap((id) => {
		const i = floorPlan.value?.tables.findIndex((t) => t.id === id) ?? -1
		return i >= 0 ? [i] : []
	})
}

async function loadStates() {
	const r = props.reservation
	if (!r || !props.venueId) { states.value = []; return }
	try {
		states.value = (await fetchStaffTableAvailability(props.venueId, { date: r.date, time: r.time, partySize: r.partySize, excludeReservationId: r.id })).tables
	} catch {
		states.value = []
	}
}

watch(() => props.reservation?.id, async (id) => {
	error.value = null
	if (!id) return
	floorPlan.value = null
	chosen.value = []
	const [plan] = await Promise.all([
		props.venueSlug ? $fetch<PublicFloorPlan>(`/api/public/venues/${props.venueSlug}/floor-plan`).catch(() => null) : null,
		loadStates(),
	])
	floorPlan.value = plan
	selectCurrent()
})

async function submit() {
	if (!props.reservation || !saveEnabled.value) return
	submitting.value = true
	error.value = null
	try {
		await updateReservation(props.reservation.id, { tableIds: chosenTableIds.value })
		emit('saved')
	} catch (e: any) {
		error.value = e.data?.message ?? (e.message || 'Cannot change table.')
		if (e.data?.message === 'table taken') { chosen.value = []; loadStates() }
	} finally {
		submitting.value = false
	}
}
</script>

<template>
	<Transition name="modal">
	<div v-if="reservation" class="modal-backdrop fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/50 p-4" @click.self="emit('close')">
		<div class="modal-panel card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto">
			<div class="flex items-center justify-between">
				<h2 class="font-display text-xl font-semibold text-ink">Change table</h2>
				<button class="btn-ghost" type="button" @click="emit('close')">Close</button>
			</div>
			<p class="mt-1 text-sm text-muted">{{ reservation.guestName }} · {{ reservation.partySize }} guests · {{ reservation.time }}</p>
			<div v-if="floorPlan?.tables.length" class="mt-4">
				<FloorPlanSvg :plan="floorPlan" pickable :chosen="chosen" :selected="chosen.length ? `t:${chosen[0]}` : null" :disabled-ids="disabledIds"
					label="Venue floor plan" @table-pick="onPick">
					<template #tooltip="{ index }">
						<strong>Table {{ index + 1 }} · {{ areaName(floorPlan.tables[index].seatingAreaId) }}</strong> · seats {{ floorPlan.tables[index].seats }}
						<template v-if="stateOf(index)?.holder"><br />{{ stateOf(index)!.holder!.guestName }} · {{ stateOf(index)!.holder!.time }}</template>
					</template>
				</FloorPlanSvg>
				<p class="mt-1.5 text-xs text-muted">Tap free tables to move this reservation. Pick several to join them.</p>
				<p v-if="chosen.length" class="mt-1.5 text-xs text-muted">{{ chosen.length }} table{{ chosen.length === 1 ? '' : 's' }}, {{ totalSeats }} seat{{ totalSeats === 1 ? '' : 's' }} for {{ reservation.partySize }} pax</p>
				<div v-if="chosen.length && !seatsCoverParty" class="alert-warn mt-2 text-sm">Chosen tables seat {{ totalSeats }}, party needs {{ reservation.partySize }}.</div>
			</div>
			<div v-if="error" class="alert-danger mt-3">{{ error }}</div>
			<div class="mt-4 flex justify-end gap-2">
				<button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
				<button type="button" class="btn-primary" :disabled="submitting || !saveEnabled" @click="submit">
					{{ submitting ? 'Saving…' : 'Change table' }}
				</button>
			</div>
		</div>
	</div>
	</Transition>
</template>
