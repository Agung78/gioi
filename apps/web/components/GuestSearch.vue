<script setup lang="ts">
import { ref, watch } from 'vue'
import { PhStar, PhWarning, PhWheelchair } from '@phosphor-icons/vue'
import { fetchGuests, type StaffGuest } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{ (e: 'open', id: string): void }>()

const auth = useAuthStore()
const query = ref('')
const results = ref<StaffGuest[]>([])
const searching = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

// Server-side search (name, phone, email), debounced; `seq` drops out-of-order responses.
watch([query, () => (auth.isSuperAdmin ? auth.selectedVenueId : null)], ([v, venueId]) => {
	clearTimeout(timer)
	const q = v.trim()
	if (q.length < 2) {
		seq++
		results.value = []
		searching.value = false
		return
	}
	searching.value = true
	timer = setTimeout(async () => {
		const mine = ++seq
		try {
			const found = await fetchGuests(q, venueId ?? undefined)
			if (mine === seq) results.value = found
		} catch {
			if (mine === seq) results.value = []
		} finally {
			if (mine === seq) searching.value = false
		}
	}, 250)
})

function open(g: StaffGuest) {
	emit('open', g.id)
}

function highlight(g: StaffGuest): string[] {
	const flags: string[] = []
	if (g.allergies?.length) flags.push('allergy')
	if (g.accessibility) flags.push('accessibility')
	if ((g.visits ?? 0) > 1) flags.push('repeat')
	return flags
}
</script>

<template>
	<div class="space-y-3">
		<input
			v-model="query"
			type="search"
			class="field"
			placeholder="Search by name, phone, or email"
		/>
		<div v-if="query.length < 2" class="text-sm text-muted">Type at least 2 characters.</div>
		<div v-else-if="searching" class="text-sm text-muted">Searching…</div>
		<div v-else-if="results.length === 0" class="text-sm text-muted">No guests match.</div>
		<ul v-else class="divide-y divide-line rounded-surface border border-line bg-raised">
			<li
				v-for="g in results"
				:key="g.id"
				class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-line/40"
				@click="open(g)"
			>
				<div>
					<p class="font-medium text-ink">{{ g.fullName }}</p>
					<p class="text-xs text-muted">{{ g.phone }} · {{ g.visits ?? 0 }} visits</p>
				</div>
				<div class="flex flex-wrap items-center gap-1">
					<span v-for="f in highlight(g)" :key="f" class="chip" :class="{
						'bg-danger/15 text-danger': f === 'allergy' || f === 'accessibility',
						'bg-accent/15 text-accent': f === 'repeat',
					}">
						<template v-if="f === 'allergy'"><PhWarning :size="14" weight="fill" aria-hidden="true" /> Allergy: {{ g.allergies.join(', ') }}</template>
						<template v-else-if="f === 'accessibility'"><PhWheelchair :size="14" aria-hidden="true" /> {{ g.accessibility }}</template>
						<template v-else><PhStar :size="14" weight="fill" aria-hidden="true" /> Repeat</template>
					</span>
				</div>
			</li>
		</ul>
	</div>
</template>
