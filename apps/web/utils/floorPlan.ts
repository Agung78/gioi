import type { FloorObject, FloorPlanArea } from '@gioi/domain'

// Geometry ported from docs/gioi_bali_2d_floor_plan.html (plan units, item centre at 0,0).

export const TABLE_SCALE = 0.95
const CHAIR_GAP = 13

/** One icon for every table: body widens with chairs, chairs split over the two long sides. */
export function tableShape(seats: number) {
	const top = Math.ceil(seats / 2)
	const bottom = seats - top
	const row = (n: number, y: number) => Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * CHAIR_GAP, y }))
	return {
		width: Math.max(38, CHAIR_GAP * top + 12),
		chairs: [...row(top, -16), ...row(bottom, 16)],
	}
}

/** Label lines and font size that fit an object's box. */
export function objectText(o: Pick<FloorObject, 'label' | 'width' | 'height'>) {
	const label = o.label.trim()
	const words = label.split(/\s+/).filter(Boolean)
	const lines = words.length > 1 && label.length > 8 ? words : [label]
	const fontSize = Math.max(11, Math.min(28, o.height / (lines.length + 1.5), o.width / (Math.max(...lines.map((l) => l.length), 1) * 0.7)))
	return {
		fontSize,
		lines: lines.map((text, i) => ({ text, y: (i - (lines.length - 1) / 2) * fontSize * 1.15 + fontSize * 0.35 })),
	}
}

export const OBJECT_PRESETS: Record<string, Pick<FloorObject, 'label' | 'width' | 'height' | 'color'>> = {
	Stage: { width: 156, height: 232, color: '#E87A3A', label: 'MAIN STAGE' },
	Bar: { width: 200, height: 56, color: '#1F4A6B', label: 'BAR' },
	'DJ booth': { width: 90, height: 60, color: '#7A5C8E', label: 'DJ' },
	Entrance: { width: 110, height: 36, color: '#6B7A88', label: 'ENTRANCE' },
	Planter: { width: 60, height: 60, color: '#7BA05B', label: '' },
	Custom: { width: 120, height: 80, color: '#C9B58F', label: 'OBJECT' },
}

// Table body tint per seating area (order of `areas`); chairs stay navy.
const AREA_COLORS = ['#D6C4A3', '#BFD9E6', '#C9D8B6', '#E8C3B0', '#D4C5E2', '#F0DFA8', '#B9D4CF', '#E2CBD5']

export function areaColor(areas: FloorPlanArea[], areaId: string): string {
	const i = areas.findIndex((a) => a.id === areaId)
	return i < 0 ? '#D6C4A3' : AREA_COLORS[i % AREA_COLORS.length]
}

/** Keep a centre point inside the plan box. */
export function clampToPlan<T extends { x: number; y: number }>(item: T, plan: { width: number; height: number }): T {
	item.x = Math.min(plan.width, Math.max(0, item.x))
	item.y = Math.min(plan.height, Math.max(0, item.y))
	return item
}
