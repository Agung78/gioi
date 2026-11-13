<script setup lang="ts">
import { computed } from 'vue'
import { PhSunHorizon } from '@phosphor-icons/vue'
import type { SlotAvailability } from '@/types/venue'

const props = defineProps<{
  slots: SlotAvailability[]
  modelValue: string | null
  partySize: number
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string | null): void }>()

// ponytail: fixed buckets; sunset hint is a static Kuta approximation, derive from date if it matters
const GROUPS = [
  { key: 'lunch', label: 'Lunch', from: 0 },
  { key: 'afternoon', label: 'Afternoon', from: 14 * 60 },
  { key: 'sunset', label: 'Sunset', from: 17 * 60, hint: 'Sun goes down around 18:15' },
  { key: 'dinner', label: 'Dinner', from: 19 * 60 },
] as const

/** One admin-configured event slot replaces every normal slot on that date. */
const eventSlot = computed(() => props.slots.find((s) => s.label))

const grouped = computed(() =>
  GROUPS.map((g, i) => {
    const to = GROUPS[i + 1]?.from ?? Infinity
    const items = props.slots.filter((s) => {
      const m = Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3, 5))
      return m >= g.from && m < to
    })
    return { ...g, items }
  }).filter((g) => g.items.length),
)

function pick(time: string) {
  emit('update:modelValue', props.modelValue === time ? null : time)
}

function reasonLabel(reason: SlotAvailability['reason'] | undefined): string {
  switch (reason) {
    case 'closed': return 'Closed'
    case 'full': return 'Full'
    case 'past': return 'Too soon'
    case 'lead_time': return 'Too soon'
    case 'cutoff': return 'Too soon'
    default: return 'Unavailable'
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Event day: exactly one named slot, replaces all normal groups. -->
    <div v-if="eventSlot" class="mb-2">
      <button
        type="button"
        class="pill min-h-16 flex-col items-start px-4 py-2"
        :class="[modelValue === eventSlot.time ? 'pill-on' : '', !eventSlot.open ? 'cursor-not-allowed opacity-40' : 'hover:border-accent']"
        :aria-disabled="!eventSlot.open"
        :disabled="!eventSlot.open"
        :aria-pressed="modelValue === eventSlot.time"
        @click="pick(eventSlot.time)"
      >
        <span class="font-semibold">{{ eventSlot.label }}</span>
        <span class="text-xs font-medium opacity-80">{{ eventSlot.time }}</span>
        <span v-if="eventSlot.note" class="text-xs opacity-80 whitespace-pre-line">{{ eventSlot.note }}</span>
      </button>
    </div>

    <div v-for="g in (eventSlot ? [] : grouped)" :key="g.key">
      <p class="mb-2 flex items-center gap-2 text-sm font-semibold">
        <PhSunHorizon v-if="g.key === 'sunset'" :size="20" class="text-accent" aria-hidden="true" />
        {{ g.label }}
        <span v-if="'hint' in g" class="font-normal text-muted">{{ g.hint }}</span>
      </p>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        <button
          v-for="slot in g.items"
          :key="slot.time"
          type="button"
          class="pill min-h-12 flex-col py-1.5"
          :class="[
            modelValue === slot.time ? 'pill-on' : '',
            !slot.open ? 'cursor-not-allowed opacity-40' : 'hover:border-accent',
          ]"
          :aria-disabled="!slot.open"
          :disabled="!slot.open"
          :aria-pressed="modelValue === slot.time"
          @click="pick(slot.time)"
        >
          <span class="font-semibold">{{ slot.time }}</span>
          <span v-if="!slot.open && slot.reason" class="text-xs font-normal">{{ reasonLabel(slot.reason) }}</span>
          <span v-else-if="slot.open && slot.remaining != null && slot.remaining <= 2" class="text-xs font-normal opacity-80">{{ slot.remaining }} left</span>
        </button>
      </div>
    </div>
  </div>
</template>
