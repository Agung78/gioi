<script setup lang="ts">
import { computed, ref } from 'vue'
import { nextStatuses, statusLabel } from '@gioi/domain'
import type { ReservationStatus } from '@gioi/domain'

const props = defineProps<{ reservation: { status: ReservationStatus } }>()
const emit = defineEmits<{ (e: 'change', to: ReservationStatus): void }>()

const DESTRUCTIVE: ReservationStatus[] = ['cancelled', 'no_show']
// Buttons are actions; statusLabel() names states ("Confirmed"), which reads as already done.
const ACTION: Partial<Record<ReservationStatus, string>> = { confirmed: 'Confirm', seated: 'Seat', completed: 'Complete', cancelled: 'Cancel' }
const action = (s: ReservationStatus) => ACTION[s] ?? statusLabel(s)
const options = computed(() => nextStatuses(props.reservation.status))
const primary = computed(() => options.value.find((s) => !DESTRUCTIVE.includes(s)))
const destructive = computed(() => options.value.filter((s) => DESTRUCTIVE.includes(s)))
const confirming = ref<ReservationStatus | null>(null)

function go(to: ReservationStatus) {
	confirming.value = null
	emit('change', to)
}
</script>

<template>
	<div class="flex flex-wrap items-center gap-2">
		<template v-if="confirming">
			<span class="text-sm font-medium">Mark as {{ statusLabel(confirming) }}?</span>
			<button type="button" class="btn-danger min-h-11 px-4 text-sm" @click="go(confirming)">
				Yes, {{ statusLabel(confirming) }}
			</button>
			<button type="button" class="btn-secondary min-h-11 px-4 text-sm" @click="confirming = null">
				Keep booking
			</button>
		</template>
		<template v-else>
			<button v-if="primary" type="button" class="btn-primary min-h-11 px-5 text-sm font-semibold" @click="go(primary)">
				{{ action(primary) }}
			</button>
			<button
				v-for="d in destructive"
				:key="d"
				type="button"
				class="btn-secondary min-h-11 px-4 text-sm text-danger"
				@click="confirming = d"
			>
				{{ action(d) }}
			</button>
			<span v-if="options.length === 0" class="text-sm text-muted">No further actions</span>
		</template>
	</div>
</template>
