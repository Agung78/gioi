<script setup lang="ts">
import { computed } from 'vue'
import { nextStatuses, statusLabel } from '../domain/status'
import type { Reservation, ReservationStatus } from '../domain/types'

const props = defineProps<{
  reservation: Reservation
}>()

const emit = defineEmits<{
  (e: 'change', to: ReservationStatus): void
}>()

const options = computed(() => nextStatuses(props.reservation.status))

function toneClass(s: ReservationStatus): string {
  switch (s) {
    case 'confirmed': return 'bg-sky-600 text-white hover:bg-sky-700'
    case 'arrived': return 'bg-indigo-600 text-white hover:bg-indigo-700'
    case 'seated': return 'bg-violet-600 text-white hover:bg-violet-700'
    case 'completed': return 'bg-emerald-600 text-white hover:bg-emerald-700'
    case 'cancelled': return 'bg-red-600 text-white hover:bg-red-700'
    case 'no_show': return 'bg-red-700 text-white hover:bg-red-800'
    default: return 'bg-gioi-moss text-white hover:bg-gioi-olive'
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      v-for="next in options"
      :key="next"
      type="button"
      class="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-sm"
      :class="toneClass(next)"
      @click="emit('change', next)"
    >
      {{ statusLabel(next) }}
    </button>
    <span v-if="options.length === 0" class="text-xs text-gioi-moss/60">No further actions</span>
  </div>
</template>