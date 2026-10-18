<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '../stores/data'
import { PhStar, PhWarning, PhWheelchair } from '@phosphor-icons/vue'
import type { Guest } from '../domain/types'

const data = useDataStore()
const router = useRouter()
const query = ref('')

const results = computed<Guest[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return []
  return data.guests.filter((g) => {
    return (
      g.fullName.toLowerCase().includes(q) ||
      g.phone.toLowerCase().includes(q) ||
      (g.email ?? '').toLowerCase().includes(q)
    )
  }).slice(0, 8)
})

function visitCount(guestId: string): number {
  return data.reservations.filter((r) =>
    r.guestId === guestId && ['arrived', 'seated', 'completed'].includes(r.status),
  ).length
}

function open(g: Guest) {
  router.push({ name: 'guest', params: { id: g.id } })
}

function highlight(g: Guest): string[] {
  const flags: string[] = []
  if (g.allergies?.length) flags.push('allergy')
  if (g.accessibility) flags.push('accessibility')
  if (visitCount(g.id) > 1) flags.push('repeat')
  return flags
}
</script>

<template>
  <div class="space-y-3">
    <input
      v-model="query"
      type="search"
      class="field"
      placeholder="Search by name, phone, or email"
    />
    <div v-if="query.length < 2" class="text-sm text-muted">Type at least 2 characters.</div>
    <div v-else-if="results.length === 0" class="text-sm text-muted">No guests match.</div>
    <ul v-else class="divide-y divide-line rounded-surface border border-line bg-raised">
      <li
        v-for="g in results"
        :key="g.id"
        class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-line/40"
        @click="open(g)"
      >
        <div>
          <p class="font-medium text-ink">{{ g.fullName }}</p>
          <p class="text-xs text-muted">{{ g.phone }} · {{ visitCount(g.id) }} visits</p>
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <span v-for="f in highlight(g)" :key="f" class="chip" :class="{
            'bg-danger/15 text-danger': f === 'allergy' || f === 'accessibility',
            'bg-accent/15 text-accent': f === 'repeat',
          }">
            <template v-if="f === 'allergy'"><PhWarning :size="14" weight="fill" aria-hidden="true" /> Allergy: {{ g.allergies.join(', ') }}</template>
            <template v-else-if="f === 'accessibility'"><PhWheelchair :size="14" aria-hidden="true" /> {{ g.accessibility }}</template>
            <template v-else><PhStar :size="14" weight="fill" aria-hidden="true" /> Repeat</template>
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>