// Pure reservation status machine.

import type { ReservationStatus } from './types'

/** Allowed forward transitions. Cancelled and no_show are intentionally not listed here. */
const FORWARD: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['arrived', 'cancelled'],
  arrived: ['seated', 'no_show'],
  seated: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
}

const CANCELLABLE_FROM: ReservationStatus[] = ['pending', 'confirmed']
const NO_SHOW_FROM: ReservationStatus[] = ['confirmed', 'arrived']

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  if (from === to) return false
  if (to === 'cancelled') return CANCELLABLE_FROM.includes(from)
  if (to === 'no_show') return NO_SHOW_FROM.includes(from)
  return (FORWARD[from] ?? []).includes(to)
}

export function nextStatuses(from: ReservationStatus): ReservationStatus[] {
  const forward = FORWARD[from] ?? []
  const out: ReservationStatus[] = [...forward]
  if (CANCELLABLE_FROM.includes(from) && !out.includes('cancelled')) out.push('cancelled')
  if (NO_SHOW_FROM.includes(from) && !out.includes('no_show')) out.push('no_show')
  return out
}

export function isTerminal(status: ReservationStatus): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'no_show'
}

export function isCancellable(from: ReservationStatus): boolean {
  return CANCELLABLE_FROM.includes(from)
}

export function isNoShowable(from: ReservationStatus): boolean {
  return NO_SHOW_FROM.includes(from)
}

export function statusLabel(status: ReservationStatus): string {
  switch (status) {
    case 'pending': return 'Pending'
    case 'confirmed': return 'Confirmed'
    case 'arrived': return 'Arrived'
    case 'seated': return 'Seated'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    case 'no_show': return 'No-show'
  }
}

/** One-accent scale: outline -> tint -> solid, danger for cancel/no-show. Pair with statusIcon + label. */
export function statusChipClass(status: ReservationStatus): string {
  switch (status) {
    case 'pending': return 'text-muted ring-1 ring-inset ring-muted/50'
    case 'confirmed': return 'text-accent ring-1 ring-inset ring-accent'
    case 'arrived': return 'bg-accent/20 text-accent'
    case 'seated': return 'bg-accent text-accent-ink'
    case 'completed': return 'bg-line text-ink'
    case 'cancelled': return 'text-danger ring-1 ring-inset ring-danger'
    case 'no_show': return 'bg-danger/15 text-danger'
  }
}

/** Phosphor component names (resolved in StatusChip). */
export function statusIcon(status: ReservationStatus): string {
  return {
    pending: 'PhHourglass', confirmed: 'PhCheckCircle', arrived: 'PhDoorOpen', seated: 'PhArmchair',
    completed: 'PhCheck', cancelled: 'PhXCircle', no_show: 'PhUserMinus',
  }[status]
}
