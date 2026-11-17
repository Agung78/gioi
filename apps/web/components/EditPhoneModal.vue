<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhWhatsappLogo } from '@phosphor-icons/vue'
import PhoneInput from '@/components/PhoneInput.vue'
import type { StaffReservation } from '@/composables/useApi'

const props = defineProps<{
	reservation: StaffReservation | null
	saving: boolean
	error: string | null
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'save', phone: string): void
}>()

const closeOnEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && props.reservation) emit('close') }
onMounted(() => document.addEventListener('keydown', closeOnEsc))
onBeforeUnmount(() => document.removeEventListener('keydown', closeOnEsc))

const draft = ref('')
watch(() => props.reservation?.id, (id) => {
	if (id) draft.value = props.reservation?.guestPhone ?? ''
})
</script>

<template>
	<Transition name="modal">
	<div v-if="reservation" class="modal-backdrop fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/50 p-4" @click.self="emit('close')">
		<form class="modal-panel card w-full max-w-md" @submit.prevent="emit('save', draft.trim())">
			<div class="flex items-center justify-between">
				<h2 class="font-display text-xl font-semibold text-ink">{{ reservation.guestPhone ? 'Edit phone' : 'Add phone' }}</h2>
				<button class="btn-ghost" type="button" @click="emit('close')">Close</button>
			</div>
			<p class="mt-1 text-sm text-muted">{{ reservation.guestName }} · {{ reservation.bookingCode }}</p>
			<div class="mt-4">
				<label class="label" for="edit-phone">WhatsApp / phone</label>
				<PhoneInput id="edit-phone" v-model="draft" />
			</div>
			<p v-if="reservation.status === 'completed'" class="mt-1.5 text-xs text-muted">The feedback link will open in WhatsApp after saving.</p>
			<div v-if="error" class="alert-danger mt-3">{{ error }}</div>
			<div class="mt-4 flex justify-end gap-2">
				<button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
				<button type="submit" class="btn-primary inline-flex items-center gap-2" :disabled="saving">
					<PhWhatsappLogo v-if="reservation.status === 'completed'" :size="20" aria-hidden="true" />
					{{ saving ? 'Saving…' : reservation.status === 'completed' ? 'Save & send feedback' : 'Save' }}
				</button>
			</div>
		</form>
	</div>
	</Transition>
</template>
