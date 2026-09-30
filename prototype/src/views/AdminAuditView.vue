<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDataStore } from '../stores/data'
import type { AuditEvent } from '../domain/types'

const data = useDataStore()
const filter = ref<'all' | AuditEvent['entityType']>('all')

const events = computed(() => {
  if (filter.value === 'all') return data.audit
  return data.audit.filter((e) => e.entityType === filter.value)
})

function describe(e: AuditEvent): string {
  switch (e.action) {
    case 'reservation.created': return `Created reservation ${data.getReservation(e.entityId)?.bookingCode ?? e.entityId}`
    case 'reservation.updated': return `Edited reservation ${data.getReservation(e.entityId)?.bookingCode ?? e.entityId}`
    case 'reservation.status_changed': return `Status ${(e.changes as { status?: { from: string; to: string } })?.status?.from} → ${(e.changes as { status?: { from: string; to: string } })?.status?.to}`
    case 'settings.updated': return 'Settings updated'
    case 'seating_area.updated': return 'Seating areas updated'
    case 'user.updated': return 'Users updated'
    default: return e.action
  }
}

function fields(e: AuditEvent): string {
  if (!e.changes) return ''
  return Object.keys(e.changes).join(', ')
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <header class="mb-6 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-gioi-moss/70">Super Admin</p>
        <h1 class="font-display text-3xl font-semibold text-gioi-moss">Audit log</h1>
      </div>
      <select v-model="filter" class="field w-auto">
        <option value="all">All events</option>
        <option value="reservation">Reservations</option>
        <option value="reservation_status">Status changes</option>
        <option value="settings">Settings</option>
        <option value="seating_area">Seating areas</option>
        <option value="user">Users</option>
      </select>
    </header>

    <div v-if="events.length === 0" class="card text-center text-gioi-moss/70">
      No audit events yet. Status changes and settings updates appear here as you make them.
    </div>
    <ol v-else class="space-y-2">
      <li v-for="e in events" :key="e.id" class="card !p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="font-medium text-gioi-ink">{{ describe(e) }}</p>
          <p class="text-xs text-gioi-moss/70">{{ new Date(e.at).toLocaleString() }}</p>
        </div>
        <p class="mt-1 text-xs text-gioi-moss/70">
          <strong>{{ e.actorName }}</strong> · {{ e.entityType }}
          <span v-if="fields(e)"> · changed: {{ fields(e) }}</span>
          <span v-if="e.note"> · {{ e.note }}</span>
        </p>
      </li>
    </ol>
  </div>
</template>