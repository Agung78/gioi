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
  color: 'rgb(var(--accent))',
})

const maxVal = computed(() => props.max ?? Math.max(1, ...props.rows.map((r) => r.value)))
</script>

<template>
  <div class="space-y-2">
    <div v-for="row in rows" :key="row.label" class="flex items-center gap-3 text-sm">
      <span class="w-24 shrink-0 truncate text-muted" :title="row.label">{{ row.label }}</span>
      <div class="relative h-5 min-w-8 flex-1 rounded bg-line/40">
        <div
          class="absolute inset-y-0 left-0 rounded"
          :style="{ width: `${Math.max(2, (row.value / maxVal) * 100)}%`, background: color }"
        />
      </div>
      <span class="shrink-0 whitespace-nowrap text-right tabular-nums text-ink">{{ row.value }}<span v-if="row.meta" class="ml-2 text-xs text-muted">{{ row.meta }}</span></span>
    </div>
  </div>
</template>
