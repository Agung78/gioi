<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  values: number[]
  height?: number
  color?: string
  fill?: string
}>(), {
  height: 80,
  color: 'rgb(var(--accent))',
  fill: 'rgb(var(--accent) / 0.12)',
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
</script>

<template>
  <svg :viewBox="`0 0 100 ${height}`" preserveAspectRatio="none" class="w-full" :style="{ height: `${height}px` }" aria-hidden="true">
    <path :d="area" :style="{ fill }" stroke="none" />
    <path :d="path" :style="{ stroke: color }" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
  </svg>
</template>
