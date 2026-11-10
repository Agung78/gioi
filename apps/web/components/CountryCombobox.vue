<script setup lang="ts">
import { computed, ref } from 'vue'

const model = defineModel<string>({ default: '' })
const props = defineProps<{ id: string; placeholder?: string }>()

const names = new Intl.DisplayNames(['en'], { type: 'region' })
// Intl returns the bare code for unassigned regions; drop those.
const all = Array.from({ length: 26 * 26 }, (_, i) => String.fromCharCode(65 + ((i / 26) | 0), 65 + (i % 26)))
	.map((code) => names.of(code))
	.filter((n, i, a): n is string => !!n && !/^[A-Z]{2}$|Unknown/.test(n) && a.indexOf(n) === i)
	.sort()

const open = ref(false)
const active = ref(0)

// Prefix matches first, then substring matches.
const options = computed(() => {
	const q = model.value.trim().toLowerCase()
	if (!q) return all
	const starts = all.filter((c) => c.toLowerCase().startsWith(q))
	return [...starts, ...all.filter((c) => !starts.includes(c) && c.toLowerCase().includes(q))]
})

function pick(c: string) {
	model.value = c
	open.value = false
}

function onKey(e: KeyboardEvent) {
	if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
		e.preventDefault()
		open.value = true
		const n = options.value.length
		if (n) active.value = (active.value + (e.key === 'ArrowDown' ? 1 : n - 1)) % n
		document.getElementById(`${props.id}-opt-${active.value}`)?.scrollIntoView({ block: 'nearest' })
	} else if (e.key === 'Enter' && open.value && options.value[active.value]) {
		e.preventDefault()
		pick(options.value[active.value])
	} else if (e.key === 'Escape') open.value = false
}
</script>

<template>
	<div class="relative">
		<input
			:id="id" v-model="model" class="field" role="combobox" autocomplete="off" :placeholder="placeholder"
			:aria-expanded="open && options.length > 0" :aria-controls="`${id}-list`" aria-autocomplete="list"
			:aria-activedescendant="open ? `${id}-opt-${active}` : undefined"
			@focus="open = true" @blur="open = false" @input="open = true; active = 0" @keydown="onKey"
		/>
		<ul
			v-show="open && options.length" :id="`${id}-list`" role="listbox"
			class="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-surface border border-line bg-raised py-1 shadow-soft"
		>
			<li
				v-for="(c, i) in options" :id="`${id}-opt-${i}`" :key="c" role="option" :aria-selected="c === model"
				class="min-h-11 cursor-pointer px-3.5 py-2.5 text-base text-ink"
				:class="{ 'bg-line/40': i === active, 'font-medium text-accent': c === model }"
				@mousedown.prevent="pick(c)" @mousemove="active = i"
			>{{ c }}</li>
		</ul>
	</div>
</template>
