<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// Output: "+62 812-345-678" (empty when no digits). Type "62" or "indo" in the code box to pick a country.
const model = defineModel<string>({ default: '' })
const props = defineProps<{ id: string; invalid?: boolean; describedby?: string; optional?: boolean }>()
const emit = defineEmits<{ blur: [] }>()

// Every ISO 3166 region with an assigned calling code. NANP Caribbean regions carry their area code (e.g. BS '1242') so they stay distinguishable from US/CA.
const DIAL: Record<string, string> = {
	AF: '93', AL: '355', DZ: '213', AS: '1684', AD: '376', AO: '244', AI: '1264', AG: '1268', AR: '54', AM: '374', AW: '297', AU: '61',
	AT: '43', AZ: '994', BS: '1242', BH: '973', BD: '880', BB: '1246', BY: '375', BE: '32', BZ: '501', BJ: '229', BM: '1441', BT: '975',
	BO: '591', BQ: '599', BA: '387', BW: '267', BR: '55', IO: '246', VG: '1284', BN: '673', BG: '359', BF: '226', BI: '257', KH: '855',
	CM: '237', CA: '1', CV: '238', KY: '1345', CF: '236', TD: '235', CL: '56', CN: '86', CX: '61', CC: '61', CO: '57', KM: '269',
	CK: '682', CR: '506', HR: '385', CU: '53', CW: '599', CY: '357', CZ: '420', CD: '243', DK: '45', DJ: '253', DM: '1767', DO: '1809',
	EC: '593', EG: '20', SV: '503', GQ: '240', ER: '291', EE: '372', SZ: '268', ET: '251', FK: '500', FO: '298', FJ: '679', FI: '358',
	FR: '33', GF: '594', PF: '689', GA: '241', GM: '220', GE: '995', DE: '49', GH: '233', GI: '350', GR: '30', GL: '299', GD: '1473',
	GP: '590', GU: '1671', GT: '502', GG: '44', GN: '224', GW: '245', GY: '592', HT: '509', HN: '504', HK: '852', HU: '36', IS: '354',
	IN: '91', ID: '62', IR: '98', IQ: '964', IE: '353', IM: '44', IL: '972', IT: '39', CI: '225', JM: '1876', JP: '81', JE: '44',
	JO: '962', KZ: '7', KE: '254', KI: '686', XK: '383', KW: '965', KG: '996', LA: '856', LV: '371', LB: '961', LS: '266', LR: '231',
	LY: '218', LI: '423', LT: '370', LU: '352', MO: '853', MG: '261', MW: '265', MY: '60', MV: '960', ML: '223', MT: '356', MH: '692',
	MQ: '596', MR: '222', MU: '230', YT: '262', MX: '52', FM: '691', MD: '373', MC: '377', MN: '976', ME: '382', MS: '1664', MA: '212',
	MZ: '258', MM: '95', NA: '264', NR: '674', NP: '977', NL: '31', NC: '687', NZ: '64', NI: '505', NE: '227', NG: '234', NU: '683',
	KP: '850', MK: '389', MP: '1670', NO: '47', OM: '968', PK: '92', PW: '680', PS: '970', PA: '507', PG: '675', PY: '595', PE: '51',
	PH: '63', PL: '48', PT: '351', PR: '1787', QA: '974', CG: '242', RE: '262', RO: '40', RU: '7', RW: '250', BL: '590', SH: '290',
	KN: '1869', LC: '1758', MF: '590', PM: '508', VC: '1784', WS: '685', SM: '378', ST: '239', SA: '966', SN: '221', RS: '381', SC: '248',
	SL: '232', SG: '65', SX: '1721', SK: '421', SI: '386', SB: '677', SO: '252', ZA: '27', KR: '82', SS: '211', ES: '34', LK: '94',
	SD: '249', SR: '597', SJ: '47', SE: '46', CH: '41', SY: '963', TW: '886', TJ: '992', TZ: '255', TH: '66', TL: '670', TG: '228',
	TK: '690', TO: '676', TT: '1868', TN: '216', TR: '90', TM: '993', TC: '1649', TV: '688', VI: '1340', UG: '256', UA: '380', AE: '971',
	GB: '44', US: '1', UY: '598', UZ: '998', VU: '678', VA: '379', VE: '58', VN: '84', WF: '681', EH: '212', YE: '967', ZM: '260',
	ZW: '263', AX: '358',
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
// Parent clearing the value (e.g. a modal reset) must clear the digits too; a stored "+62 812-345-678" is split back into country + number.
watch(model, (v) => {
	if (!v) { national.value = ''; return }
	if (v === (national.value ? `${sel.value.dial} ${national.value}` : '')) return
	const digits = v.replace(/\D/g, '')
	const hasPlus = v.trim().startsWith('+')
	const match = hasPlus ? all.filter((c) => digits.startsWith(c.dial.slice(1))).sort((a, b) => b.dial.length - a.dial.length)[0] : undefined
	if (match) sel.value = match
	national.value = digits.slice(match ? match.dial.length - 1 : 0).replace(/^0+/, '').slice(0, 13).replace(/(\d{3})(?=\d)/g, '$1-')
}, { immediate: true })

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
				:id="id" :value="national" :required="!optional" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="812-345-678"
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
