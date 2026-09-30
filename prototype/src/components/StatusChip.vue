<script setup lang="ts">
import { PhHourglass, PhCheckCircle, PhDoorOpen, PhArmchair, PhCheck, PhXCircle, PhUserMinus } from '@phosphor-icons/vue'
import { statusChipClass, statusIcon, statusLabel } from '../domain/status'
import type { ReservationStatus } from '../domain/types'

defineProps<{ status: ReservationStatus }>()
const icons: Record<string, unknown> = { PhHourglass, PhCheckCircle, PhDoorOpen, PhArmchair, PhCheck, PhXCircle, PhUserMinus }
</script>

<template>
  <span class="chip px-3 py-1.5 text-sm" :class="statusChipClass(status)">
    <component :is="icons[statusIcon(status)]" :size="18" aria-hidden="true" />
    {{ statusLabel(status) }}
  </span>
</template>
