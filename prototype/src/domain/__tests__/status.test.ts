import { describe, expect, it } from 'vitest'
import {
  canTransition,
  isCancellable,
  isNoShowable,
  isTerminal,
  nextStatuses,
  statusLabel,
} from '../status'

describe('reservation status machine', () => {
  it('allows the happy path forward', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true)
    expect(canTransition('confirmed', 'arrived')).toBe(true)
    expect(canTransition('arrived', 'seated')).toBe(true)
    expect(canTransition('seated', 'completed')).toBe(true)
  })

  it('allows cancel from pending or confirmed only', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true)
    expect(canTransition('confirmed', 'cancelled')).toBe(true)
    expect(canTransition('arrived', 'cancelled')).toBe(false)
    expect(canTransition('seated', 'cancelled')).toBe(false)
    expect(canTransition('completed', 'cancelled')).toBe(false)
  })

  it('allows no-show from confirmed or arrived only', () => {
    expect(canTransition('confirmed', 'no_show')).toBe(true)
    expect(canTransition('arrived', 'no_show')).toBe(true)
    expect(canTransition('pending', 'no_show')).toBe(false)
    expect(canTransition('seated', 'no_show')).toBe(false)
    expect(canTransition('completed', 'no_show')).toBe(false)
  })

  it('rejects backward transitions', () => {
    expect(canTransition('arrived', 'confirmed')).toBe(false)
    expect(canTransition('seated', 'arrived')).toBe(false)
    expect(canTransition('completed', 'seated')).toBe(false)
  })

  it('rejects same-state transitions', () => {
    expect(canTransition('confirmed', 'confirmed')).toBe(false)
    expect(canTransition('cancelled', 'cancelled')).toBe(false)
  })

  it('rejects transitions from terminal states', () => {
    for (const t of ['completed', 'cancelled', 'no_show'] as const) {
      expect(canTransition(t, 'confirmed')).toBe(false)
      expect(canTransition(t, 'arrived')).toBe(false)
    }
  })

  it('nextStatuses lists every reachable state', () => {
    expect(nextStatuses('pending').sort()).toEqual(['cancelled', 'confirmed'].sort())
    expect(nextStatuses('confirmed').sort()).toEqual(['arrived', 'cancelled', 'no_show'].sort())
    expect(nextStatuses('arrived').sort()).toEqual(['no_show', 'seated'].sort())
    expect(nextStatuses('seated')).toEqual(['completed'])
    expect(nextStatuses('completed')).toEqual([])
    expect(nextStatuses('cancelled')).toEqual([])
    expect(nextStatuses('no_show')).toEqual([])
  })

  it('isTerminal flags end states', () => {
    expect(isTerminal('completed')).toBe(true)
    expect(isTerminal('cancelled')).toBe(true)
    expect(isTerminal('no_show')).toBe(true)
    expect(isTerminal('pending')).toBe(false)
    expect(isTerminal('seated')).toBe(false)
  })

  it('isCancellable / isNoShowable match transition rules', () => {
    expect(isCancellable('pending')).toBe(true)
    expect(isCancellable('confirmed')).toBe(true)
    expect(isCancellable('arrived')).toBe(false)
    expect(isNoShowable('confirmed')).toBe(true)
    expect(isNoShowable('arrived')).toBe(true)
    expect(isNoShowable('pending')).toBe(false)
  })

  it('statusLabel returns readable strings', () => {
    expect(statusLabel('no_show')).toBe('No-show')
    expect(statusLabel('pending')).toBe('Pending')
  })
})