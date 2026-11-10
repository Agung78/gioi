<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PublicFloorPlan, StaffTableState } from '@gioi/domain'
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
const chosenIdx = ref<number | null>(null)
const error = ref<string | null>(null)
const submitting = ref(false)

const chosenTableId = computed(() => (chosenIdx.value != null ? floorPlan.value?.tables[chosenIdx.value]?.id : undefined))
// Takeover is walk-in only, so every state (small/held/late) is disabled here.
const disabledIds = computed(() => states.value.map((s) => s.tableId))
const areaName = (id: string) => props.areas.find((a) => a.id === id)?.name
const stateOf = (i: number) => states.value.find((s) => s.tableId === floorPlan.value?.tables[i]?.id)
const onPick = (i: number) => { chosenIdx.value = i }

function selectCurrent() {
	const id = props.reservation?.tableId
	chosenIdx.value = id && floorPlan.value ? floorPlan.value.tables.findIndex((t) => t.id === id) : null
	if (chosenIdx.value === -1) chosenIdx.value = null
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
	chosenIdx.value = null
	const [plan] = await Promise.all([
		props.venueSlug ? $fetch<PublicFloorPlan>(`/api/public/venues/${props.venueSlug}/floor-plan`).catch(() => null) : null,
		loadStates(),
	])
	floorPlan.value = plan
	selectCurrent()
})

async function submit() {
	if (!props.reservation || !chosenTableId.value) return
	submitting.value = true
	error.value = null
	try {
		await updateReservation(props.reservation.id, { tableId: chosenTableId.value })
		emit('saved')
	} catch (e: any) {
		error.value = e.data?.message ?? (e.message || 'Cannot change table.')
		if (e.data?.message === 'table taken') { chosenIdx.value = null; loadStates() }
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
				<FloorPlanSvg :plan="floorPlan" pickable :chosen="chosenIdx" :selected="chosenIdx != null ? `t:${chosenIdx}` : null" :disabled-ids="disabledIds"
					label="Venue floor plan" @table-pick="onPick">
					<template #tooltip="{ index }">
						<strong>{{ areaName(floorPlan.tables[index].seatingAreaId) }}</strong> · seats {{ floorPlan.tables[index].seats }}
						<template v-if="stateOf(index)?.holder"><br />{{ stateOf(index)!.holder!.guestName }} · {{ stateOf(index)!.holder!.time }}</template>
					</template>
				</FloorPlanSvg>
				<p class="mt-1.5 text-xs text-muted">Tap a free table to move this reservation.</p>
			</div>
			<div v-if="error" class="alert-danger mt-3">{{ error }}</div>
			<div class="mt-4 flex justify-end gap-2">
				<button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
				<button type="button" class="btn-primary" :disabled="submitting || !chosenTableId || chosenTableId === reservation.tableId" @click="submit">
					{{ submitting ? 'Saving…' : 'Change table' }}
				</button>
			</div>
		</div>
	</div>
	</Transition>
</template>
