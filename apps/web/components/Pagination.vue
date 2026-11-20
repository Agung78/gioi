<script setup lang="ts">
defineProps<{ pageCount: number }>()
const page = defineModel<number>('page', { required: true })
</script>

<template>
	<nav v-if="pageCount > 1" class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm" aria-label="Pagination">
		<button type="button" class="btn-secondary justify-self-start !min-h-10 !px-4" :disabled="page <= 1" @click="page--">Previous</button>
		<span class="text-muted" aria-live="polite">Page {{ page }} of {{ pageCount }}</span>
		<button type="button" class="btn-secondary justify-self-end !min-h-10 !px-4" :disabled="page >= pageCount" @click="page++">Next</button>
	</nav>
</template>
