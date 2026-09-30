<script setup lang="ts">
import { computed } from 'vue'
import type { SlotAvailability } from '../domain/availability'

const props = defineProps<{
  slots: SlotAvailability[]
  modelValue: string | null
  partySize: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const grouped = computed(() => {
  const lunch: SlotAvailability[] = []
  const dinner: SlotAvailability[] = []
  for (const s of props.slots) {
    const mins = Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3, 5))
    if (mins < 17 * 60) lunch.push(s)
    else dinner.push(s)
  }
  return { lunch, dinner }
})

function pick(time: string) {
  if (props.modelValue === time) {
    emit('update:modelValue', null)
  } else {
    emit('update:modelValue', time)
  }
}

function reasonLabel(reason: SlotAvailability['reason']): string {
  switch (reason) {
    case 'closed': return 'Closed'
    case 'full': return 'Full'
    case 'past': return 'Too soon'
    default: return 'Unavailable'
  }
}
</script>

<template>
  <div class="space-y-4">
    <template v-for="(group, label) in grouped" :key="label">
      <div v-if="group.length">
        <p class="label mb-2">{{ label === 'lunch' ? 'Lunch' : 'Dinner' }}</p>
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          <button
            v-for="slot in group"
            :key="slot.time"
            type="button"
            class="rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gioi-moss/40 disabled:cursor-not-allowed"
            :class="[
              modelValue === slot.time
                ? 'border-gioi-moss bg-gioi-moss text-white shadow'
                : slot.open
                  ? 'border-gioi-sand bg-white text-gioi-ink hover:border-gioi-moss/60'
                  : 'border-gioi-sand/60 bg-gioi-sand/40 text-gioi-moss/40 line-through',
            ]"
            :disabled="!slot.open"
            @click="pick(slot.time)"
          >
            {{ slot.time }}
            <span v-if="!slot.open && slot.reason" class="block text-[10px] font-normal uppercase tracking-wide">
              {{ reasonLabel(slot.reason) }}
            </span>
            <span v-else-if="slot.open && slot.remaining != null" class="block text-[10px] font-normal text-gioi-moss/60">
              {{ slot.remaining }} left
            </span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>