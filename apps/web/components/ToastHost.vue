<script setup lang="ts">
import { onMounted } from 'vue'
import { PhCheckCircle, PhWarningCircle } from '@phosphor-icons/vue'
import { takePendingToast, useToast } from '@/composables/useToast'

const { message, toast } = useToast()
function runAction() {
	const action = message.value?.action
	message.value = null
	action?.run()
}
onMounted(() => { const text = takePendingToast(); if (text) toast(text) })
</script>

<template>
	<div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:bottom-6" role="status" aria-live="polite">
		<Transition name="toast" mode="out-in">
			<div
				v-if="message"
				:key="message.id"
				class="pointer-events-auto flex items-center gap-2.5 rounded-surface border bg-raised px-4 py-3 text-sm font-medium text-ink shadow-soft"
				:class="message.kind === 'error' ? 'border-danger/40' : 'border-line'"
			>
				<component :is="message.kind === 'error' ? PhWarningCircle : PhCheckCircle" :size="20" weight="fill" class="shrink-0" :class="message.kind === 'error' ? 'text-danger' : 'text-accent'" aria-hidden="true" />
				{{ message.text }}
				<button v-if="message.action" type="button" class="pointer-events-auto -my-2 -mr-2 min-h-11 rounded-full px-4 font-semibold text-accent underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" @click="runAction">{{ message.action.label }}</button>
			</div>
		</Transition>
	</div>
</template>
