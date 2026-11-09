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
}>(), { highlightAreaId: null, selected: null, interactive: false, label: 'Floor plan' })

const emit = defineEmits<{
	(e: 'item-down', kind: 't' | 'o', index: number, ev: PointerEvent): void
	(e: 'background-down', ev: PointerEvent): void
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
	opacity: props.highlightAreaId && t.seatingAreaId !== props.highlightAreaId ? 0.22 : bookable.value.get(t.seatingAreaId) === false ? 0.5 : 1,
})))
const objects = computed(() => props.plan.objects.map((o) => ({ ...o, text: objectText(o) })))
</script>

<template>
	<svg
		ref="svg"
		:viewBox="`0 0 ${plan.width} ${plan.height}`"
		class="block h-auto w-full select-none rounded-surface bg-[#F6F1E6]"
		:style="interactive ? 'touch-action: none' : undefined"
		role="img"
		:aria-label="label"
		@pointerdown.self="emit('background-down', $event)"
	>
		<image v-if="plan.image" :href="plan.image" x="0" y="0" :width="plan.width" :height="plan.height" preserveAspectRatio="xMidYMid meet" pointer-events="none" />
		<g
			v-for="(o, i) in objects"
			:key="`o${i}`"
			:transform="`translate(${o.x} ${o.y}) rotate(${o.rotation})`"
			:class="[interactive && 'cursor-grab', selected === `o:${i}` && 'floor-sel']"
			:opacity="highlightAreaId ? 0.22 : 1"
			class="transition-opacity motion-reduce:transition-none"
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
			:class="[interactive && 'cursor-grab', selected === `t:${i}` && 'floor-sel']"
			:opacity="t.opacity"
			class="transition-opacity motion-reduce:transition-none"
			@pointerdown="emit('item-down', 't', i, $event)"
		>
			<rect v-for="(c, j) in t.shape.chairs" :key="j" :x="c.x - 4.5" :y="c.y - 4" width="9" height="8" rx="3.5" fill="#1F4A6B" stroke="#F6F1E6" stroke-width=".9" />
			<rect :x="-t.shape.width / 2" y="-12" :width="t.shape.width" height="24" rx="6" :fill="t.fill" stroke="#102638" stroke-width="1.2" />
			<circle v-for="(cx, j) in t.shape.candles" :key="`c${j}`" :cx="cx" r="2.6" fill="#E87A3A" stroke="#102638" stroke-width=".8" />
		</g>
	</svg>
</template>

<style scoped>
.floor-sel {
	filter: drop-shadow(0 0 4px #e87a3a) drop-shadow(0 0 1px #e87a3a);
}
</style>
