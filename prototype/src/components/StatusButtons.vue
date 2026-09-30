<script setup lang="ts">
import { computed, ref } from 'vue'
import { nextStatuses, statusLabel } from '../domain/status'
import type { Reservation, ReservationStatus } from '../domain/types'

const props = defineProps<{ reservation: Reservation }>()
const emit = defineEmits<{ (e: 'change', to: ReservationStatus): void }>()

const DESTRUCTIVE: ReservationStatus[] = ['cancelled', 'no_show']
const options = computed(() => nextStatuses(props.reservation.status))
const primary = computed(() => options.value.find((s) => !DESTRUCTIVE.includes(s)))
const destructive = computed(() => options.value.filter((s) => DESTRUCTIVE.includes(s)))
const confirming = ref<ReservationStatus | null>(null)

function go(to: ReservationStatus) {
  confirming.value = null
  emit('change', to)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <template v-if="confirming">
      <span class="text-sm font-medium">Mark as {{ statusLabel(confirming) }}?</span>
      <button type="button" class="btn-danger min-h-12" @click="go(confirming)">Yes, {{ statusLabel(confirming) }}</button>
      <button type="button" class="btn-secondary min-h-12" @click="confirming = null">Keep booking</button>
    </template>
    <template v-else>
      <button v-if="primary" type="button" class="btn-primary min-h-14 px-8 text-base" @click="go(primary)">
        {{ statusLabel(primary) }}
      </button>
      <button
        v-for="d in destructive"
        :key="d"
        type="button"
        class="btn-secondary min-h-12 text-danger"
        @click="confirming = d"
      >
        {{ statusLabel(d) }}
      </button>
      <span v-if="options.length === 0" class="text-sm text-muted">No further actions</span>
    </template>
  </div>
</template>
