<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { checkAvailability, todayISO } from '@gioi/domain'
import type { Channel } from '@gioi/domain'
import { createWalkIn, changeReservationStatus } from '@/composables/useApi'

const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'created', reservationId: string): void
}>()

const fullName = ref('')
const phone = ref('')
const email = ref('')
const partySize = ref(2)
const time = ref('19:00')
const seatingAreaId = ref('')
const occasion = ref('')
const source = ref<Channel>('walk_in')
const guestNotes = ref('')
const allergiesText = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

const date = todayISO()

watch(() => props.open, (val) => {
	if (val) {
		error.value = null
		fullName.value = ''
		email.value = ''
		partySize.value = 2
		time.value = '19:00'
		seatingAreaId.value = ''
		occasion.value = ''
		guestNotes.value = ''
		allergiesText.value = ''
	}
})

const check = computed(() => {
	if (!seatingAreaId.value) return null
	return checkAvailability(
		// settings + reservations are passed by the host page via a scoped check prop instead
		{} as any,
		[] as any,
		{
			date,
			time: time.value,
			partySize: partySize.value,
			seatingAreaId: seatingAreaId.value,
		},
		{ skipTemporal: true },
	)
})

async function submit() {
	error.value = null
	if (!fullName.value.trim() || !phone.value.trim()) {
		error.value = 'Name and phone are required.'
		return
	}
	submitting.value = true
	try {
		const r = await createWalkIn({
			guestName: fullName.value.trim(),
			phone: phone.value.trim(),
			email: email.value.trim() || undefined,
			date,
			time: time.value,
			partySize: partySize.value,
			seatingAreaId: seatingAreaId.value || undefined,
			occasion: occasion.value.trim() || undefined,
			guestNotes: guestNotes.value.trim() || undefined,
			source: source.value,
		})
		await changeReservationStatus(r.reservationId, { to: 'confirmed' })
		emit('created', r.reservationId)
		emit('close')
	} catch (e: any) {
		error.value = e.message || 'Failed to create walk-in.'
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
					<div class="sm:col-span-2">
						<label class="label">Email</label>
						<input v-model="email" class="field" />
					</div>
					<div>
						<label class="label">Party size</label>
						<input v-model.number="partySize" type="number" min="1" class="field" />
					</div>
					<div>
						<label class="label">Time</label>
						<input v-model="time" type="time" class="field" />
					</div>
					<div>
						<label class="label">Seating area</label>
						<input v-model="seatingAreaId" class="field" placeholder="area id" />
					</div>
					<div class="col-span-2">
						<label class="label">Occasion</label>
						<input v-model="occasion" class="field" />
					</div>
					<div class="col-span-2">
						<label class="label">Guest notes</label>
						<input v-model="guestNotes" class="field" />
					</div>
					<div class="col-span-2">
						<label class="label">Allergies (comma-separated)</label>
						<input v-model="allergiesText" class="field" />
					</div>
				</div>
				<p v-if="error" class="alert-danger">{{ error }}</p>
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
