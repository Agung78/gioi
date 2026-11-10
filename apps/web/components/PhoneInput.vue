<script setup lang="ts">
import { computed, ref } from 'vue'

// Output: "+62 812-345-678" (empty when no digits). Type "62" or "indo" in the code box to pick a country.
const model = defineModel<string>({ default: '' })
const props = defineProps<{ id: string; invalid?: boolean; describedby?: string }>()
const emit = defineEmits<{ blur: [] }>()

// ponytail: common booking markets only; add rows here for more countries.
const DIAL: Record<string, string> = {
	ID: '62', SG: '65', MY: '60', TH: '66', VN: '84', PH: '63', AU: '61', NZ: '64', JP: '81', KR: '82', CN: '86', HK: '852', TW: '886',
	IN: '91', AE: '971', SA: '966', QA: '974', TR: '90', GB: '44', IE: '353', FR: '33', DE: '49', NL: '31', BE: '32', CH: '41', AT: '43',
	ES: '34', PT: '351', IT: '39', SE: '46', NO: '47', DK: '45', FI: '358', PL: '48', RU: '7', ZA: '27', EG: '20', BR: '55', MX: '52',
	AR: '54', CL: '56', CO: '57', US: '1', CA: '1',
}
const names = new Intl.DisplayNames(['en'], { type: 'region' })
const all = Object.entries(DIAL)
	.map(([iso, dial]) => ({ iso, dial: `+${dial}`, name: names.of(iso) ?? iso }))
	.sort((a, b) => a.name.localeCompare(b.name))

const sel = ref(all.find((c) => c.iso === 'ID')!)
const query = ref('')
const open = ref(false)
const active = ref(0)
const national = ref('')

const options = computed(() => {
	const q = query.value.trim().toLowerCase().replace(/^\+/, '')
	if (!q) return all
	return all.filter((c) => c.dial.slice(1).startsWith(q) || c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q)
})

function sync() {
	model.value = national.value ? `${sel.value.dial} ${national.value}` : ''
}
function pick(c: (typeof all)[number]) {
	sel.value = c
	open.value = false
	sync()
}
function onNational(e: Event) {
	const el = e.target as HTMLInputElement
	national.value = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13).replace(/(\d{3})(?=\d)/g, '$1-')
	el.value = national.value
	sync()
}
function onKey(e: KeyboardEvent) {
	const n = options.value.length
	if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
		e.preventDefault()
		open.value = true
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
		<div
			class="flex rounded-input border border-line bg-raised focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"
			:class="{ '!border-danger': invalid }"
		>
			<div class="flex w-28 shrink-0 items-center gap-1.5 border-r border-line pl-3.5">
				<span class="text-sm text-muted" aria-hidden="true">{{ sel.iso }}</span>
				<input
					:value="open ? query : sel.dial" class="w-full min-w-0 bg-transparent py-2.5 pr-2 text-base tabular-nums text-ink focus:outline-none"
					role="combobox" autocomplete="off" aria-label="Country code" inputmode="search" :aria-expanded="open && options.length > 0"
					:aria-controls="`${id}-list`" aria-autocomplete="list" :aria-activedescendant="open ? `${id}-opt-${active}` : undefined"
					@focus="open = true; query = ''; active = 0" @blur="open = false"
					@input="query = ($event.target as HTMLInputElement).value; open = true; active = 0" @keydown="onKey"
				/>
			</div>
			<input
				:id="id" :value="national" required type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="812-345-678"
				class="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-base tabular-nums text-ink placeholder:text-muted/60 focus:outline-none"
				:aria-invalid="invalid" :aria-describedby="describedby" @input="onNational" @blur="emit('blur')"
			/>
		</div>
		<ul
			v-show="open && options.length" :id="`${id}-list`" role="listbox"
			class="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-surface border border-line bg-raised py-1 shadow-soft"
		>
			<li
				v-for="(c, i) in options" :id="`${id}-opt-${i}`" :key="c.iso" role="option" :aria-selected="c.iso === sel.iso"
				class="flex min-h-11 cursor-pointer items-center justify-between px-3.5 py-2.5 text-base text-ink"
				:class="{ 'bg-line/40': i === active, 'font-medium text-accent': c.iso === sel.iso }"
				@mousedown.prevent="pick(c)" @mousemove="active = i"
			><span>{{ c.name }}</span><span class="tabular-nums text-muted">{{ c.dial }}</span></li>
		</ul>
	</div>
</template>
