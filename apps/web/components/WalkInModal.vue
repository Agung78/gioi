<script setup lang="ts">
import { ref, watch } from 'vue'
import { todayISO } from '@gioi/domain'
import type { Channel } from '@gioi/domain'
import { createWalkIn, changeReservationStatus } from '@/composables/useApi'

const props = defineProps<{
	open: boolean
	areas: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'created', reservationId: string): void
}>()

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

watch(() => props.open, (val) => {
	if (val) {
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
