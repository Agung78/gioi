<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PublicFloorPlan } from '@gioi/domain'
import { TABLE_SCALE, areaColor, objectText, tableShape } from '@/utils/floorPlan'

// Renders a floor plan (backdrop drawing, objects, tables). Shared by the admin editor and the
// guest booking map; interaction lives in the parent via the emitted pointer events.
const props = withDefaults(defineProps<{
	plan: PublicFloorPlan
	highlightAreaId?: string | null // fade every other area's tables
	selected?: string | null // 't:<index>' or 'o:<index>'
	interactive?: boolean // grab cursors + no touch scrolling (editor)
	label?: string
	pickable?: boolean // guest mode: tables are click/keyboard targets with a roomy hit area
	chosen?: number[] | null // guest mode: confirmed table indexes; each gets a persistent ring
	disabledIds?: string[] // guest mode: table ids that cannot be picked (dimmed)
}>(), { highlightAreaId: null, selected: null, chosen: null, interactive: false, label: 'Floor plan', pickable: false, disabledIds: () => [] })

const emit = defineEmits<{
	(e: 'item-down', kind: 't' | 'o', index: number, ev: PointerEvent): void
	(e: 'background-down', ev: PointerEvent): void
	(e: 'table-pick', index: number): void
}>()

const svg = ref<SVGSVGElement | null>(null)

/** Screen point → plan units. */
function toPlan(ev: { clientX: number; clientY: number }) {
	const m = svg.value?.getScreenCTM()
	if (!m) return { x: 0, y: 0 }
	const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse())
	return { x: p.x, y: p.y }
}
defineExpose({ toPlan })

const bookable = computed(() => new Map(props.plan.areas.map((a) => [a.id, a.bookable])))
const tables = computed(() => props.plan.tables.map((t) => ({
	...t,
	shape: tableShape(t.seats),
	fill: areaColor(props.plan.areas, t.seatingAreaId),
	off: !!t.id && props.disabledIds.includes(t.id),
	opacity: t.id && props.disabledIds.includes(t.id) ? 0.35 : props.highlightAreaId && t.seatingAreaId !== props.highlightAreaId ? 0.22 : bookable.value.get(t.seatingAreaId) === false ? 0.5 : 1,
})))
const objects = computed(() => props.plan.objects.map((o) => ({ ...o, text: objectText(o) })))
const areaName = (id: string) => props.plan.areas.find((a) => a.id === id)?.name ?? 'Table'

// Hover/focus preview (mouse + keyboard only; touch taps go through table-pick). Content comes from the parent's `tooltip` slot.
const hovered = ref<number | null>(null)
const tip = computed(() => {
	const t = hovered.value != null && props.selected == null ? props.plan.tables[hovered.value] : null
	return t ? { index: hovered.value as number, left: (t.x / props.plan.width) * 100, top: (t.y / props.plan.height) * 100, below: t.y / props.plan.height < 0.2 } : null
})
</script>

<template>
	<div class="relative">
	<svg
		ref="svg"
		:viewBox="`0 0 ${plan.width} ${plan.height}`"
		class="block h-auto w-full select-none rounded-surface bg-[#F6F1E6]"
		:style="interactive ? 'touch-action: none' : undefined"
		:role="pickable ? 'group' : 'img'"
		:aria-label="label"
		@pointerdown.self="emit('background-down', $event)"
	>
		<image v-if="plan.image" :href="plan.image" x="0" y="0" :width="plan.width" :height="plan.height" preserveAspectRatio="xMidYMid meet" pointer-events="none" />
		<g
			v-for="(o, i) in objects"
			:key="`o${i}`"
			:transform="`translate(${o.x} ${o.y}) rotate(${o.rotation})`"
			:class="[interactive && 'cursor-grab', selected === `o:${i}` && 'floor-sel', 'floor-fade']"
			:opacity="highlightAreaId ? 0.22 : 1"
			@pointerdown="emit('item-down', 'o', i, $event)"
		>
			<rect :x="-o.width / 2" :y="-o.height / 2" :width="o.width" :height="o.height" :rx="Math.min(27, o.width / 4, o.height / 4)" :fill="o.color" stroke="#102638" stroke-width="1.2" />
			<text text-anchor="middle" fill="#fff" font-weight="800" :font-size="o.text.fontSize" font-family="ui-sans-serif,system-ui,sans-serif">
				<tspan v-for="(l, j) in o.text.lines" :key="j" x="0" :y="l.y">{{ l.text }}</tspan>
			</text>
		</g>
		<g
			v-for="(t, i) in tables"
			:key="`t${i}`"
			:transform="`translate(${t.x} ${t.y}) rotate(${t.rotation}) scale(${TABLE_SCALE})`"
			:class="[interactive && 'cursor-grab', pickable && 'floor-pick', pickable && t.off && 'floor-off', !pickable && selected === `t:${i}` && 'floor-sel', 'floor-fade']"
			:style="pickable ? { animationDelay: `${Math.min(i * 30, 360)}ms` } : undefined"
			:opacity="t.opacity"
			:role="pickable ? 'button' : undefined"
			:aria-disabled="pickable && t.off ? 'true' : undefined"
			:tabindex="pickable && !t.off ? 0 : undefined"
			:aria-label="pickable ? `Table ${i + 1} for ${t.seats}, ${areaName(t.seatingAreaId)}${t.off ? ' (unavailable)' : ''}` : undefined"
			@pointerdown="emit('item-down', 't', i, $event)"
			@click="pickable && !t.off && emit('table-pick', i)"
			@keydown.enter.space.prevent="pickable && !t.off && emit('table-pick', i)"
			@pointerenter="pickable && $event.pointerType === 'mouse' && (hovered = i)"
			@pointerleave="hovered = null"
			@focus="hovered = i"
			@blur="hovered = null"
		>
			<rect v-if="pickable" :x="-t.shape.width / 2 - 12" y="-30" :width="t.shape.width + 24" height="60" rx="14" fill="transparent" class="floor-hit" />
			<rect v-if="pickable && (selected === `t:${i}` || chosen?.includes(i))" :x="-t.shape.width / 2 - 8" y="-22" :width="t.shape.width + 16" height="44" rx="12" fill="none" stroke="#e87a3a" stroke-width="2.5" vector-effect="non-scaling-stroke" class="floor-ring" pointer-events="none" />
			<g class="floor-body">
				<rect v-for="(c, j) in t.shape.chairs" :key="j" :x="c.x - 4.5" :y="c.y - 4" width="9" height="8" rx="3.5" fill="#1F4A6B" stroke="#F6F1E6" stroke-width=".9" />
				<rect :x="-t.shape.width / 2" y="-12" :width="t.shape.width" height="24" rx="6" :fill="chosen?.includes(i) ? '#E87A3A' : t.fill" stroke="#102638" stroke-width="1.2" class="floor-top" />
				<!-- number = position in the plan's table order; counter-rotated to stay upright, halo keeps it legible on any fill -->
				<text :transform="`rotate(${-t.rotation})`" dy=".35em" text-anchor="middle" :font-size="i > 98 ? 10 : 13" font-weight="800" font-family="ui-sans-serif,system-ui,sans-serif" fill="#102638" :stroke="chosen?.includes(i) ? '#E87A3A' : t.fill" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke" pointer-events="none">{{ i + 1 }}</text>
			</g>
		</g>
		<!-- "Your table" badge: upright, not rotated/scaled with the table -->
		<g v-if="pickable && chosen?.length && tables[chosen[0]]" :transform="`translate(${tables[chosen[0]].x} ${tables[chosen[0]].y - 30 * TABLE_SCALE - 12})`" pointer-events="none">
			<g class="floor-badge">
				<circle r="10" fill="#E87A3A" stroke="#fff" stroke-width="2" />
				<path d="M-4.5 0.5 L-1.5 3.5 L4.5 -3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</g>
		</g>
	</svg>
	<Transition name="floor-tip">
		<div v-if="tip && $slots.tooltip" role="tooltip" class="floor-tip pointer-events-none absolute z-10 whitespace-nowrap rounded-input bg-ink px-3 py-2 text-xs text-surface shadow-soft" :class="tip.below && 'floor-tip-below'" :style="{ left: `${tip.left}%`, top: `${tip.top}%` }">
			<slot name="tooltip" :index="tip.index" />
		</div>
	</Transition>
	</div>
</template>

<style scoped>
/* Strong ease-out, matches the app's route/modal curve. Opacity only: positions must never animate (editor drags). */
.floor-fade { transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1); }
.floor-sel { filter: drop-shadow(0 0 4px #e87a3a) drop-shadow(0 0 1px #e87a3a); }
.floor-pick { cursor: pointer; outline: none; }
.floor-pick.floor-off { cursor: not-allowed; }
.floor-pick .floor-hit { transition: fill 150ms ease, stroke 150ms ease; }
.floor-pick:focus-visible .floor-hit { fill: rgba(232, 122, 58, 0.18); stroke: #e87a3a; stroke-width: 1.5; }
/* press feedback on the table body (the group's own transform positions it, so scale the child) */
.floor-body { transform-box: fill-box; transform-origin: center; transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1); }
.floor-pick:active .floor-body { transform: scale(0.95); }
.floor-pick:active .floor-hit { fill: rgba(232, 122, 58, 0.32); }
@media (hover: hover) and (pointer: fine) {
	.floor-pick:hover .floor-hit { fill: rgba(232, 122, 58, 0.18); stroke: #e87a3a; stroke-width: 1.5; }
}
/* booking map: tables fade in once, staggered (delay set inline, capped). */
.floor-pick { animation: floor-in 300ms cubic-bezier(0.23, 1, 0.32, 1) backwards; }
/* selection ring settles once instead of pulsing forever while the dialog is open. */
.floor-ring { animation: floor-ring 200ms cubic-bezier(0.23, 1, 0.32, 1) backwards; transform-box: fill-box; transform-origin: center; }
@keyframes floor-in { from { opacity: 0; } }
@keyframes floor-ring { from { opacity: 0; transform: scale(0.92); } }
.floor-top { transition: fill 200ms ease; }
.floor-badge { transform-box: fill-box; transform-origin: center; animation: floor-badge 220ms cubic-bezier(0.23, 1, 0.32, 1) backwards; }
@keyframes floor-badge { from { opacity: 0; transform: scale(0.6); } }
@media (prefers-reduced-motion: reduce) { .floor-pick, .floor-ring, .floor-badge { animation: none; } .floor-body { transition: none; } }
</style>
<style>
.floor-tip { translate: -50% calc(-100% - 22px); transform-origin: bottom center; }
.floor-tip-below { translate: -50% 22px; transform-origin: top center; }
.floor-tip-enter-active, .floor-tip-leave-active { transition: opacity 120ms cubic-bezier(0.23, 1, 0.32, 1), scale 120ms cubic-bezier(0.23, 1, 0.32, 1); }
.floor-tip-enter-from, .floor-tip-leave-to { opacity: 0; scale: 0.96; }
@media (prefers-reduced-motion: reduce) { .floor-tip-enter-from, .floor-tip-leave-to { scale: 1; } }
</style>
