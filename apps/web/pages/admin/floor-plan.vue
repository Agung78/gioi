<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { FLOOR_TABLE_MAX_SEATS, type AdminFloorPlan, type FloorObject, type FloorPlanArea, type FloorTable } from '@gioi/domain'
import { useAuthStore } from '@/stores/auth'
import FloorPlanSvg from '@/components/FloorPlanSvg.vue'
import { fetchFloorPlan, saveFloorLayout } from '@/composables/useApi'
import { OBJECT_PRESETS, areaColor, clampToPlan } from '@/utils/floorPlan'

// Venue-admin floor plan editor (docs/floor_plan_seating.md), ported from docs/gioi_bali_2d_floor_plan.html.
// Seats per area become that area's bookable capacity on save (API side).

const auth = useAuthStore()
const venueId = computed(() => auth.adminVenueId)

const loading = ref(true)
const plan = ref<AdminFloorPlan | null>(null)
const areas = ref<FloorPlanArea[]>([])
const tables = ref<FloorTable[]>([])
const objects = ref<FloorObject[]>([])
const selected = ref<string | null>(null) // 't:<index>' | 'o:<index>'
const hovered = ref<string | null>(null)
const pinned = ref<string | null>(null)
const dirty = ref(false)
const error = ref<string | null>(null)
const objectType = ref(Object.keys(OBJECT_PRESETS)[0])
const svgRef = ref<InstanceType<typeof FloorPlanSvg> | null>(null)

const canEdit = computed(() => !!plan.value?.canEdit)
// Live draft rendered by the shared component (backdrop + areas from the server, items from the editor).
const draft = computed(() => plan.value && { ...plan.value, areas: areas.value, tables: tables.value, objects: objects.value })
const pinnedArea = computed(() => areas.value.find((a) => a.id === pinned.value) ?? null)
const highlight = computed(() => hovered.value ?? pinned.value)

const current = computed(() => {
	const [kind, i] = selected.value?.split(':') ?? []
	const item = kind === 't' ? tables.value[+i] : kind === 'o' ? objects.value[+i] : undefined
	return item ? { kind: kind as 't' | 'o', index: +i, item } : null
})
const selTable = computed(() => (current.value?.kind === 't' ? (current.value.item as FloorTable) : null))
const selObj = computed(() => (current.value?.kind === 'o' ? (current.value.item as FloorObject) : null))

const stats = computed(() => new Map(areas.value.map((a) => {
	const ts = tables.value.filter((t) => t.seatingAreaId === a.id)
	return [a.id, { count: ts.length, seats: ts.reduce((s, t) => s + t.seats, 0) }]
})))
const totalSeats = computed(() => tables.value.reduce((s, t) => s + t.seats, 0))

const touch = () => { dirty.value = true }

function load(p: AdminFloorPlan) {
	plan.value = p
	areas.value = structuredClone(p.areas)
	tables.value = structuredClone(p.tables).map((t) => clampToPlan(t, p))
	objects.value = structuredClone(p.objects).map((o) => clampToPlan(o, p))
	if (!areas.value.some((a) => a.id === pinned.value)) pinned.value = areas.value[0]?.id ?? null
	selected.value = null
	dirty.value = false
}

async function reload() {
	if (!venueId.value) { loading.value = false; return }
	loading.value = true
	error.value = null
	try {
		load(await fetchFloorPlan(venueId.value))
	} catch (e) {
		error.value = (e as { data?: { message?: string } })?.data?.message ?? 'Could not load the floor plan.'
	} finally {
		loading.value = false
	}
}

function move(item: FloorTable | FloorObject, dx: number, dy: number, dr: number) {
	item.x += dx
	item.y += dy
	clampToPlan(item, plan.value!)
	item.rotation = (((item.rotation + dr) % 360) + 360) % 360
	touch()
}

function chairs(d: number) {
	const t = selTable.value
	if (!t) return
	t.seats = Math.min(FLOOR_TABLE_MAX_SEATS, Math.max(1, t.seats + d))
	touch()
}

function rotate(dir: 1 | -1, e: MouseEvent) {
	if (current.value) move(current.value.item, 0, 0, dir * (e.shiftKey ? 90 : 15))
}

function addTable() {
	if (!plan.value || !pinned.value) return
	tables.value.push({ seatingAreaId: pinned.value, seats: 4, x: plan.value.width / 2, y: plan.value.height / 2, rotation: 0 })
	selected.value = `t:${tables.value.length - 1}`
	touch()
}

function addObject() {
	if (!plan.value) return
	objects.value.push({ ...OBJECT_PRESETS[objectType.value], x: plan.value.width / 2, y: plan.value.height / 2, rotation: 0 })
	selected.value = `o:${objects.value.length - 1}`
	touch()
}

function addArea() {
	let name = 'New area'
	for (let n = 2; areas.value.some((a) => a.name === name); n++) name = `New area ${n}`
	const a = { id: crypto.randomUUID(), name, bookable: true, minParty: null, maxParty: null }
	areas.value.push(a)
	pinned.value = a.id
	touch()
}

function removeArea(id: string) {
	const n = tables.value.filter((t) => t.seatingAreaId === id).length
	if (n && !confirm(`Delete this area and its ${n} table${n === 1 ? '' : 's'}?`)) return
	tables.value = tables.value.filter((t) => t.seatingAreaId !== id)
	areas.value = areas.value.filter((a) => a.id !== id)
	if (pinned.value === id) pinned.value = null
	selected.value = null
	touch()
}

function remove() {
	const c = current.value
	if (!c) return
	;(c.kind === 't' ? tables : objects).value.splice(c.index, 1)
	selected.value = null
	touch()
}

function setObjectSize(key: 'width' | 'height', value: number) {
	if (selObj.value && Number.isFinite(value)) { selObj.value[key] = Math.min(600, Math.max(20, Math.round(value))); touch() }
}

// ---- drag (pointer events on window until release) ----
let drag: { item: FloorTable | FloorObject; dx: number; dy: number } | null = null

function onItemDown(kind: 't' | 'o', index: number, ev: PointerEvent) {
	if (!canEdit.value || !svgRef.value) return
	ev.preventDefault()
	selected.value = `${kind}:${index}`
	if (kind === 't') pinned.value = tables.value[index].seatingAreaId
	const item = (kind === 't' ? tables : objects).value[index]
	const p = svgRef.value.toPlan(ev)
	drag = { item, dx: item.x - p.x, dy: item.y - p.y }
	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', endDrag)
	window.addEventListener('pointercancel', endDrag)
}

function onMove(ev: PointerEvent) {
	if (!drag || !svgRef.value) return
	const p = svgRef.value.toPlan(ev)
	drag.item.x = p.x + drag.dx
	drag.item.y = p.y + drag.dy
	clampToPlan(drag.item, plan.value!)
	touch()
}

function endDrag() {
	drag = null
	window.removeEventListener('pointermove', onMove)
	window.removeEventListener('pointerup', endDrag)
	window.removeEventListener('pointercancel', endDrag)
}

// ---- keyboard ----
function onKeydown(e: KeyboardEvent) {
	if (!canEdit.value || !current.value || (e.target as HTMLElement | null)?.closest('input,select,textarea')) return
	const n = e.shiftKey ? 10 : 1
	const step: Record<string, [number, number, number]> = { ArrowLeft: [-n, 0, 0], ArrowRight: [n, 0, 0], ArrowUp: [0, -n, 0], ArrowDown: [0, n, 0], r: [0, 0, 90], R: [0, 0, 90] }
	if (e.key === '+' || e.key === '=') chairs(1)
	else if (e.key === '-') chairs(-1)
	else if (step[e.key]) { e.preventDefault(); move(current.value.item, ...step[e.key]) }
	else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove() }
}

async function save() {
	if (!venueId.value) return
	error.value = null
	const r1 = (v: number) => Math.round(v * 10) / 10
	try {
		load(await saveFloorLayout(venueId.value, {
			areas: areas.value.map((a) => ({ id: a.id, name: a.name.trim(), bookable: a.bookable, minParty: null, maxParty: null })),
			tables: tables.value.map((t) => ({ seatingAreaId: t.seatingAreaId, seats: t.seats, x: r1(t.x), y: r1(t.y), rotation: t.rotation })),
			objects: objects.value.map((o) => ({ label: o.label, width: o.width, height: o.height, color: o.color, x: r1(o.x), y: r1(o.y), rotation: o.rotation })),
		}))
	} catch (e) {
		const msg = (e as { data?: { message?: string } })?.data?.message
		error.value = `Save failed${msg ? `: ${msg}` : '.'}`
	}
}

const guardUnload = (e: BeforeUnloadEvent) => { if (dirty.value) e.preventDefault() }

onMounted(() => {
	reload()
	window.addEventListener('keydown', onKeydown)
	window.addEventListener('beforeunload', guardUnload)
})
onUnmounted(() => {
	endDrag()
	window.removeEventListener('keydown', onKeydown)
	window.removeEventListener('beforeunload', guardUnload)
})
watch(venueId, reload)

definePageMeta({ middleware: ['auth', 'admin', () => (useAuthStore().isSuperAdmin ? navigateTo('/admin/settings') : undefined)] })
</script>

<template>
	<div class="mx-auto max-w-6xl px-4 py-8">
		<header class="mb-6 flex flex-wrap items-baseline justify-between gap-3">
			<div>
				<p class="text-xs uppercase tracking-wide text-muted">Admin</p>
				<h1 class="font-display text-3xl font-semibold text-ink">Floor plan</h1>
			</div>
			<div v-if="canEdit" class="flex items-center gap-2">
				<span v-if="dirty" class="text-sm text-muted" role="status">Unsaved changes</span>
				<button class="btn-ghost" type="button" :disabled="!dirty" @click="reload">Revert</button>
				<button class="btn-primary" type="button" :disabled="!dirty" @click="save">Save layout</button>
			</div>
		</header>

		<div v-if="!venueId" class="card py-16 text-center">
			<p class="text-muted">Only venue admins can edit the floor plan.</p>
		</div>
		<div v-else-if="loading" class="card py-16 text-center">
			<p class="text-muted">Loading floor plan…</p>
		</div>
		<div v-else-if="!draft" class="alert-danger">{{ error }}</div>

		<div v-else class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
			<div class="card min-w-0">
				<div v-if="canEdit" class="mb-3 flex flex-wrap items-center gap-2">
					<span class="text-xs font-semibold uppercase tracking-wide text-muted">Add</span>
					<button class="btn-primary" type="button" :disabled="!pinnedArea" :title="pinnedArea ? '' : 'Select an area on the right first'" @click="addTable">+ Table{{ pinnedArea ? ` in ${pinnedArea.name}` : '' }}</button>
					<select v-model="objectType" class="field !w-auto" aria-label="Object type">
						<option v-for="k in Object.keys(OBJECT_PRESETS)" :key="k" :value="k">{{ k }}</option>
					</select>
					<button class="btn-secondary" type="button" @click="addObject">+ Add object</button>
				</div>

				<div v-if="canEdit" class="mb-3 flex min-h-11 flex-wrap items-center gap-3 rounded-input bg-line/30 px-3 py-2 text-sm">
					<template v-if="selTable">
						<b>Selected table <span class="font-normal text-muted">in {{ draft.areas.find((a) => a.id === selTable!.seatingAreaId)?.name }}</span></b>
						<span class="flex items-center gap-1">Chairs
							<button class="btn-secondary" type="button" aria-label="Fewer chairs" :disabled="selTable.seats <= 1" @click="chairs(-1)">−</button>
							<span class="w-6 text-center font-bold tabular-nums">{{ selTable.seats }}</span>
							<button class="btn-secondary" type="button" aria-label="More chairs" :disabled="selTable.seats >= FLOOR_TABLE_MAX_SEATS" @click="chairs(1)">+</button>
						</span>
					</template>
					<template v-else-if="selObj">
						<b>Selected object</b>
						<label class="flex items-center gap-2">Label <input v-model="selObj.label" maxlength="24" class="field !w-40" @input="touch" /></label>
						<label class="flex items-center gap-2">W <input :value="selObj.width" type="number" min="20" max="600" step="10" class="field !w-20" @change="setObjectSize('width', +($event.target as HTMLInputElement).value)" /></label>
						<label class="flex items-center gap-2">H <input :value="selObj.height" type="number" min="20" max="600" step="10" class="field !w-20" @change="setObjectSize('height', +($event.target as HTMLInputElement).value)" /></label>
					</template>
					<span v-else class="text-muted">Click a table or object on the plan to change its chairs, rotation or area.</span>
					<template v-if="current">
						<span class="flex items-center gap-1">Rotate
							<button class="btn-secondary" type="button" title="Rotate −15° (Shift −90°)" aria-label="Rotate left" @click="rotate(-1, $event)">⟲</button>
							<button class="btn-secondary" type="button" title="Rotate +15° (Shift +90°)" aria-label="Rotate right" @click="rotate(1, $event)">⟳</button>
						</span>
						<button class="btn-ghost ml-auto" type="button" title="Delete (Del)" @click="remove">Delete</button>
					</template>
				</div>

				<FloorPlanSvg
					ref="svgRef"
					:plan="draft"
					:highlight-area-id="highlight"
					:selected="selected"
					:interactive="canEdit"
					label="Venue floor plan"
					@item-down="onItemDown"
					@background-down="selected = null"
				/>
				<p class="mt-2 text-xs text-muted">
					{{ canEdit ? 'Drag to move · arrows nudge (Shift ×10) · R rotates · +/− chairs · Del removes' : 'Read only: only venue admins can change the layout.' }}
				</p>
				<p v-if="error" class="alert-danger mt-3" role="alert">{{ error }}</p>
			</div>

			<aside class="card">
				<h2 class="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted">Areas</h2>
				<ul class="grid gap-1">
					<li v-for="a in draft.areas" :key="a.id">
						<button
							type="button"
							class="grid w-full grid-cols-[12px_1fr] items-center gap-3 rounded-input px-3 py-2 text-left hover:bg-line/20 focus-visible:bg-line/20"
							:class="pinned === a.id ? '!bg-line/60 ring-1 ring-ink/30' : ''"
							:aria-pressed="pinned === a.id"
							@mouseenter="hovered = a.id"
							@mouseleave="hovered = null"
							@focus="hovered = a.id"
							@blur="hovered = null"
							@click="pinned = pinned === a.id ? null : a.id"
						>
							<i class="h-3 w-3 rounded border border-ink/60" :style="{ background: areaColor(draft.areas, a.id) }" aria-hidden="true" />
							<span class="min-w-0">
								<b class="block truncate text-sm font-semibold text-ink">{{ a.name }}</b>
								<small class="text-xs text-muted">{{ stats.get(a.id)?.count }} tables · {{ stats.get(a.id)?.seats || 0 }} seats{{ a.bookable ? '' : ' · not bookable' }}</small>
							</span>
						</button>
					</li>
				</ul>
				<button v-if="canEdit" class="btn-secondary mt-3 w-full" type="button" @click="addArea">+ Add area</button>
				<div v-if="canEdit && pinnedArea" class="mt-4 grid gap-3 border-t border-line px-3 pt-4 text-sm">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-muted">Edit selected area</h3>
					<label class="grid gap-1">Name
						<input v-model="pinnedArea.name" maxlength="80" class="field" @input="touch" />
					</label>
					<label class="flex items-center gap-2"><input v-model="pinnedArea.bookable" type="checkbox" @change="touch" /> Guests can book this area</label>
					<button class="btn-primary" type="button" @click="addTable">+ Add table</button>
					<p v-if="!stats.get(pinnedArea.id)?.count" class="text-xs text-muted">No tables yet. Add one, then drag it into place on the plan.</p>
					<button class="btn-ghost justify-self-start !text-danger" type="button" @click="removeArea(pinnedArea.id)">Delete area</button>
				</div>
				<p v-else-if="canEdit" class="mt-4 px-3 text-xs text-muted">Click an area above to rename it or add tables to it.</p>
				<div class="mt-4 flex justify-between border-t border-line px-3 pt-3 font-bold">
					<span>Total seats</span><span class="tabular-nums">{{ totalSeats }}</span>
				</div>
				<p class="mt-2 px-3 text-xs text-muted">Seats = chairs on the tables. An area with no tables can't take bookings.</p>
			</aside>
		</div>
	</div>
</template>
