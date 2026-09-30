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

export function statusChipClass(status: ReservationStatus): string {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
    case 'confirmed': return 'bg-sky-100 text-sky-800 ring-1 ring-sky-200'
    case 'arrived': return 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200'
    case 'seated': return 'bg-violet-100 text-violet-800 ring-1 ring-violet-200'
    case 'completed': return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
    case 'cancelled': return 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200'
    case 'no_show': return 'bg-red-100 text-red-800 ring-1 ring-red-200'
  }
}