<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  values: number[]
  height?: number
  color?: string
  fill?: string
  // Optional per-point text; enables the hover readout.
  labels?: string[]
  details?: string[]
  unit?: string
}>(), {
  height: 80,
  color: 'rgb(var(--accent))',
  fill: 'rgb(var(--accent) / 0.12)',
  unit: '',
})

// Points sit at the centre of n equal columns so a n-column grid below lines up with them.
const pts = computed(() => {
  const n = props.values.length
  const max = Math.max(1, ...props.values)
  return props.values.map((v, i) => [((i + 0.5) * 100) / n, props.height - (v / max) * (props.height - 8) - 4] as const)
})

const path = computed(() => (pts.value.length ? `M${pts.value.map(([x, y]) => `${x},${y}`).join(' L')}` : ''))

const area = computed(() => {
  if (!pts.value.length) return ''
  const first = pts.value[0][0]
  const last = pts.value[pts.value.length - 1][0]
  return `${path.value} L${last},${props.height} L${first},${props.height} Z`
})

const active = ref<number | null>(null)
const onMove = (e: PointerEvent) => {
  if (!props.labels) return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const n = props.values.length
  active.value = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)))
}
const tipShift = computed(() => {
  if (active.value === null) return '-50%'
  const n = props.values.length
  return active.value < 3 ? '-10%' : active.value > n - 4 ? '-90%' : '-50%'
})
</script>

<template>
  <div class="relative" :style="{ height: `${height}px` }" @pointermove="onMove" @pointerleave="active = null">
    <svg :viewBox="`0 0 100 ${height}`" preserveAspectRatio="none" class="spark-reveal block w-full" :style="{ height: `${height}px` }" aria-hidden="true">
      <path :d="area" :style="{ fill }" stroke="none" />
      <path :d="path" :style="{ stroke: color }" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    </svg>
    <template v-if="labels && active !== null">
      <div class="pointer-events-none absolute inset-y-0 w-px bg-line transition-[left] duration-100 ease-out" :style="{ left: `${pts[active][0]}%` }" />
      <div
        class="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-[left,top] duration-100 ease-out"
        :style="{ left: `${pts[active][0]}%`, top: `${pts[active][1]}px`, background: color }"
      />
      <div
        class="spark-tip pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-input border border-line bg-raised px-3 py-2 text-xs shadow-soft"
        :style="{ left: `${pts[active][0]}%`, transform: `translateX(${tipShift})` }"
        role="status"
      >
        <div class="text-muted">{{ labels[active] }}</div>
        <div class="font-semibold text-ink">{{ values[active] }}{{ unit ? ' ' + unit : '' }}</div>
        <div v-if="details?.[active]" class="text-muted">{{ details[active] }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.spark-reveal { animation: spark-reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
.spark-tip { animation: spark-tip 0.12s ease-out both; }
@keyframes spark-reveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes spark-tip { from { opacity: 0; margin-top: 4px; } to { opacity: 1; margin-top: 0; } }
@media (prefers-reduced-motion: reduce) {
  .spark-reveal, .spark-tip { animation: none; }
}
</style>
