<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  values: number[]
  height?: number
  color?: string
  fill?: string
}>(), {
  height: 80,
  color: '#3f4a2a',
  fill: 'rgba(63, 74, 42, 0.12)',
})

const path = computed(() => {
  if (props.values.length === 0) return ''
  const max = Math.max(1, ...props.values)
  const step = 100 / Math.max(1, props.values.length - 1)
  const pts = props.values.map((v, i) => `${i * step},${props.height - (v / max) * (props.height - 8) - 4}`)
  return `M${pts.join(' L')}`
})

const area = computed(() => {
  if (props.values.length === 0) return ''
  const max = Math.max(1, ...props.values)
  const step = 100 / Math.max(1, props.values.length - 1)
  const pts = props.values.map((v, i) => `${i * step},${props.height - (v / max) * (props.height - 8) - 4}`)
  const first = pts[0]
  const last = pts[pts.length - 1]
  return `M${first} L${pts.join(' L')} L${last.split(',')[0]},${props.height} L${first.split(',')[0]},${props.height} Z`
})
</script>

<template>
  <svg viewBox="0 0 100 80" preserveAspectRatio="none" class="w-full" :style="{ height: `${height}px` }">
    <path :d="area" :fill="fill" stroke="none" />
    <path :d="path" :stroke="color" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>