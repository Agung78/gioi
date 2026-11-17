<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { toCsv } from '@/utils/csv'

const props = defineProps<{
	columns: string[]
	rows: unknown[][]
	filterSummary: string
	filename: string
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const PAGE = 50
const ticked = ref(props.columns.map(() => true))
const limit = ref(PAGE)

// Indexes into the original columns, so cells stay aligned when a column is hidden.
const shown = computed(() => props.columns.map((_, i) => i).filter((i) => ticked.value[i]))
const pageRows = computed(() => props.rows.slice(0, limit.value))

const done = ref(false)
let doneTimer: ReturnType<typeof setTimeout>
function download() {
	const csv = toCsv(shown.value.map((i) => props.columns[i]), props.rows.map((r) => shown.value.map((i) => r[i])))
	const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
	const a = document.createElement('a')
	a.href = url
	a.download = props.filename
	a.click()
	setTimeout(() => URL.revokeObjectURL(url), 1000)
	done.value = true
	clearTimeout(doneTimer)
	doneTimer = setTimeout(() => { done.value = false }, 1800)
}

const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onEsc))
onUnmounted(() => { window.removeEventListener('keydown', onEsc); clearTimeout(doneTimer) })
</script>

<template>
	<div
		class="modal-backdrop fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/50 p-4"
		role="dialog" aria-modal="true" aria-label="Export reservations" @click.self="emit('close')"
	>
		<div class="modal-panel card flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden">
			<div class="flex shrink-0 items-center justify-between gap-2">
				<h2 class="font-display text-xl font-semibold text-ink">Export reservations</h2>
				<div class="flex items-center gap-2">
					<button type="button" class="btn-primary !min-h-10" :disabled="!shown.length" @click="download">{{ done ? 'Downloaded ✓' : 'Download' }}</button>
					<button class="btn-ghost" type="button" @click="emit('close')">Close</button>
				</div>
			</div>

			<p class="mt-2 shrink-0 text-sm text-muted">{{ filterSummary }} · {{ rows.length }} rows · {{ shown.length }}/{{ columns.length }} columns</p>

			<div class="mt-4 min-h-0 flex-1 overflow-auto">
				<table class="w-full border-collapse text-left text-sm">
					<thead>
						<tr>
							<th v-for="(col, i) in columns" :key="col" class="sticky top-0 z-10 bg-raised p-2 shadow-[inset_0_-1px_0_rgb(var(--line))]" :class="ticked[i] ? 'text-ink' : 'text-muted'">
								<label class="flex cursor-pointer select-none items-center gap-2 whitespace-nowrap font-semibold">
									<input v-model="ticked[i]" type="checkbox" class="rounded text-accent focus:ring-accent" :aria-label="`Include ${col}`" />
									{{ col }}
								</label>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(row, r) in pageRows" :key="r" class="border-b border-line">
							<td v-for="(_, i) in columns" :key="i" class="max-w-xs truncate whitespace-nowrap p-2" :class="ticked[i] ? 'text-ink' : 'text-muted opacity-40'">{{ row[i] ?? '' }}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div class="mt-2 flex shrink-0 items-center gap-3 text-xs text-muted">
				<span>Showing {{ pageRows.length }} of {{ rows.length }}</span>
				<button v-if="limit < rows.length" type="button" class="btn-ghost text-sm" @click="limit += PAGE">Show more</button>
			</div>
		</div>
	</div>
</template>
