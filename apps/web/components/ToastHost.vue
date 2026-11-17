<script setup lang="ts">
import { onMounted } from 'vue'
import { PhCheckCircle, PhWarningCircle } from '@phosphor-icons/vue'
import { takePendingToast, useToast } from '@/composables/useToast'

const { message, toast } = useToast()
onMounted(() => { const text = takePendingToast(); if (text) toast(text) })
</script>

<template>
	<div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:bottom-6" role="status" aria-live="polite">
		<Transition name="toast" mode="out-in">
			<div
				v-if="message"
				:key="message.id"
				class="flex items-center gap-2.5 rounded-surface border bg-raised px-4 py-3 text-sm font-medium text-ink shadow-soft"
				:class="message.kind === 'error' ? 'border-danger/40' : 'border-line'"
			>
				<component :is="message.kind === 'error' ? PhWarningCircle : PhCheckCircle" :size="20" weight="fill" class="shrink-0" :class="message.kind === 'error' ? 'text-danger' : 'text-accent'" aria-hidden="true" />
				{{ message.text }}
			</div>
		</Transition>
	</div>
</template>
