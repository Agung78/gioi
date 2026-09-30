import { defineStore } from 'pinia'
import { useDataStore } from './data'
import { canTransition } from '../domain/status'
import type { AuditEvent, Channel, Guest, Reservation, ReservationStatus, ReservationStatusEvent } from '../domain/types'
import { todayISO } from '../domain/dates'

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export interface CreateReservationInput {
  guest: Omit<Guest, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  date: string
  time: string
  partySize: number
  seatingAreaId: string
  occasion?: string
  guestNotes?: string
  source?: Channel
}

export const useReservationsStore = defineStore('reservations', () => {
  const data = useDataStore()

  function ensureGuest(input: CreateReservationInput['guest']): Guest {
    // Normalize phone: strip spaces; match against existing.
    const normalizedPhone = input.phone.replace(/\s+/g, '')
    const existing = data.guests.find((g) => g.phone.replace(/\s+/g, '') === normalizedPhone)
    const now = new Date().toISOString()
    if (existing) {
      // Refresh name/email if newer
      const updated: Guest = {
        ...existing,
        fullName: input.fullName || existing.fullName,
        email: input.email ?? existing.email,
        country: input.country ?? existing.country,
        updatedAt: now,
        allergies: input.allergies ?? existing.allergies,
        accessibility: input.accessibility ?? existing.accessibility,
        seatingPreference: input.seatingPreference ?? existing.seatingPreference,
      }
      data.guests = data.guests.map((g) => (g.id === existing.id ? updated : g))
      return updated
    }
    const guest: Guest = {
      id: input.id ?? newId('g'),
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      country: input.country,
      allergies: input.allergies ?? [],
      accessibility: input.accessibility,
      seatingPreference: input.seatingPreference,
      notes: undefined,
      marketingConsent: input.marketingConsent ?? false,
      marketingConsentAt: input.marketingConsent ? now : undefined,
      createdAt: now,
      updatedAt: now,
    }
    data.guests = [guest, ...data.guests]
    return guest
  }

  function create(input: CreateReservationInput, actorId: string, actorName: string): Reservation {
    const guest = ensureGuest(input.guest)
    const code = nextBookingCode(data.reservations)
    const now = new Date().toISOString()
    const reservation: Reservation = {
      id: newId('r'),
      bookingCode: code,
      guestId: guest.id,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      seatingAreaId: input.seatingAreaId,
      occasion: input.occasion,
      guestNotes: input.guestNotes,
      internalNotes: undefined,
      source: input.source ?? 'website',
      status: 'pending',
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
    }
    data.reservations = [reservation, ...data.reservations]

    const audit: AuditEvent = {
      id: newId('a'),
      at: now,
      actorId,
      actorName,
      action: 'reservation.created',
      entityType: 'reservation',
      entityId: reservation.id,
      note: `Created via ${reservation.source} for ${reservation.partySize} guests on ${reservation.date} ${reservation.time}`,
    }
    data.appendAudit(audit)
    return reservation
  }

  function changeStatus(
    reservationId: string,
    to: ReservationStatus,
    actorId: string,
    actorName: string,
    reason?: string,
  ): { ok: boolean; error?: string; reservation?: Reservation; event?: ReservationStatusEvent } {
    const r = data.getReservation(reservationId)
    if (!r) return { ok: false, error: 'Reservation not found' }
    if (!canTransition(r.status, to)) {
      return { ok: false, error: `Cannot transition from ${r.status} to ${to}` }
    }
    const from = r.status
    const now = new Date().toISOString()
    const updated: Reservation = { ...r, status: to, updatedAt: now }
    data.reservations = data.reservations.map((x) => (x.id === reservationId ? updated : x))

    const event: ReservationStatusEvent = {
      id: newId('s'),
      reservationId,
      fromStatus: from,
      toStatus: to,
      actorId,
      actorName,
      reason,
      at: now,
    }
    // Store status events alongside the reservation as an extra field (mutate immutably)
    updated.statusHistory = [...(r.statusHistory ?? []), event]
    data.reservations = data.reservations.map((x) => (x.id === reservationId ? updated : x))

    data.appendAudit({
      id: newId('a'),
      at: now,
      actorId,
      actorName,
      action: 'reservation.status_changed',
      entityType: 'reservation_status',
      entityId: reservationId,
      changes: { status: { from, to } },
      note: reason,
    })
    return { ok: true, reservation: updated, event }
  }

  function update(
    reservationId: string,
    patch: Partial<Pick<Reservation, 'date' | 'time' | 'partySize' | 'seatingAreaId' | 'occasion' | 'guestNotes' | 'internalNotes'>>,
    actorId: string,
    actorName: string,
  ): { ok: boolean; error?: string; reservation?: Reservation } {
    const r = data.getReservation(reservationId)
    if (!r) return { ok: false, error: 'Reservation not found' }
    const now = new Date().toISOString()
    const changes: AuditEvent['changes'] = {}
    for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
      const next = patch[key]
      if (next === undefined) continue
      const prev = (r as unknown as Record<string, unknown>)[key as string]
      if (JSON.stringify(prev) === JSON.stringify(next)) continue
      changes[key as string] = { from: prev, to: next }
    }
    if (Object.keys(changes).length === 0) return { ok: true, reservation: r }
    const updated: Reservation = { ...r, ...patch, updatedAt: now }
    data.reservations = data.reservations.map((x) => (x.id === reservationId ? updated : x))
    data.appendAudit({
      id: newId('a'),
      at: now,
      actorId,
      actorName,
      action: 'reservation.updated',
      entityType: 'reservation',
      entityId: reservationId,
      changes,
    })
    return { ok: true, reservation: updated }
  }

  function todayReservations(): Reservation[] {
    return data.reservationsByDate(todayISO())
  }

  return { create, changeStatus, update, todayReservations }
})

function nextBookingCode(reservations: Reservation[]): string {
  const taken = new Set<string>()
  for (const r of reservations) taken.add(r.bookingCode)
  // Try sequential codes first, then fall back to a timestamped suffix if collisions hit.
  for (let n = taken.size + 1; n < taken.size + 1000; n++) {
    const code = `GIOI-${n.toString(36).toUpperCase().padStart(4, '0')}`
    if (!taken.has(code)) return code
  }
  return `GIOI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}