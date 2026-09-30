import { defineStore } from 'pinia'
import { useDataStore } from './data'
import { useAuthStore } from './auth'
import type { AuditEvent, SeatingArea, Settings } from '../domain/types'

function diffSettings(prev: Settings, next: Settings): NonNullable<AuditEvent['changes']> {
  const changes: NonNullable<AuditEvent['changes']> = {}
  const topKeys: (keyof Settings)[] = [
    'bookingIntervalMinutes', 'leadTimeMinutes', 'cutoffMinutes',
    'noShowTargetPercent', 'overCapacityAlertPercent',
    'partySizeLimits', 'openingHours', 'closedDates', 'cancellationPolicy',
  ]
  for (const k of topKeys) {
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) {
      changes[k as string] = { from: prev[k], to: next[k] }
    }
  }
  // Restaurant sub-object
  if (JSON.stringify(prev.restaurant) !== JSON.stringify(next.restaurant)) {
    changes.restaurant = { from: prev.restaurant, to: next.restaurant }
  }
  return changes
}

function diffAreas(prev: SeatingArea[], next: SeatingArea[]): NonNullable<AuditEvent['changes']> {
  const before = Object.fromEntries(prev.map((a) => [a.id, a]))
  const after = Object.fromEntries(next.map((a) => [a.id, a]))
  const changes: NonNullable<AuditEvent['changes']> = {}
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[id]) !== JSON.stringify(after[id])) {
      changes[id] = { from: before[id], to: after[id] }
    }
  }
  return changes
}

export const useSettingsStore = defineStore('settings', () => {
  const data = useDataStore()
  const auth = useAuthStore()

  function updateSettings(patch: Partial<Settings>) {
    const prev = data.settings
    const next: Settings = { ...prev, ...patch }
    const changes = diffSettings(prev, next)
    if (Object.keys(changes).length === 0) return
    data.settings = next
    data.appendAudit({
      id: `a_${Math.random().toString(36).slice(2, 10)}`,
      at: new Date().toISOString(),
      actorId: auth.userId ?? 'system',
      actorName: auth.user?.name ?? 'System',
      action: 'settings.updated',
      entityType: 'settings',
      entityId: 'global',
      changes,
    })
  }

  function updateAreas(areas: SeatingArea[]) {
    const prev = data.settings.seatingAreas
    const changes = diffAreas(prev, areas)
    if (Object.keys(changes).length === 0) return
    data.settings = { ...data.settings, seatingAreas: areas }
    data.appendAudit({
      id: `a_${Math.random().toString(36).slice(2, 10)}`,
      at: new Date().toISOString(),
      actorId: auth.userId ?? 'system',
      actorName: auth.user?.name ?? 'System',
      action: 'seating_area.updated',
      entityType: 'seating_area',
      entityId: 'all',
      changes,
    })
  }

  function updateUsers(users: typeof data.users) {
    const prev = Object.fromEntries(data.users.map((u) => [u.id, u]))
    const next = Object.fromEntries(users.map((u) => [u.id, u]))
    const changes: NonNullable<AuditEvent['changes']> = {}
    for (const id of new Set([...Object.keys(prev), ...Object.keys(next)])) {
      if (JSON.stringify(prev[id]) !== JSON.stringify(next[id])) {
        changes[id] = { from: prev[id], to: next[id] }
      }
    }
    if (Object.keys(changes).length === 0) return
    data.users = users
    data.appendAudit({
      id: `a_${Math.random().toString(36).slice(2, 10)}`,
      at: new Date().toISOString(),
      actorId: auth.userId ?? 'system',
      actorName: auth.user?.name ?? 'System',
      action: 'user.updated',
      entityType: 'user',
      entityId: 'all',
      changes,
    })
  }

  return { updateSettings, updateAreas, updateUsers }
})