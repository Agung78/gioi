<script setup lang="ts">
import { computed } from 'vue'

interface Row {
  label: string
  value: number
  meta?: string
}

const props = withDefaults(defineProps<{
  rows: Row[]
  max?: number
  color?: string
}>(), {
  color: '#3f4a2a',
})

const maxVal = computed(() => props.max ?? Math.max(1, ...props.rows.map((r) => r.value)))
</script>

<template>
  <div class="space-y-2">
    <div v-for="row in rows" :key="row.label" class="flex items-center gap-3 text-sm">
      <span class="w-32 truncate text-gioi-moss/80" :title="row.label">{{ row.label }}</span>
      <div class="relative h-5 flex-1 rounded bg-gioi-sand/30">
        <div
          class="absolute inset-y-0 left-0 rounded"
          :style="{ width: `${Math.max(2, (row.value / maxVal) * 100)}%`, background: color }"
        />
      </div>
      <span class="w-20 text-right tabular-nums text-gioi-ink">{{ row.value }}{{ row.meta ? ' ' + row.meta : '' }}</span>
    </div>
  </div>
</template>