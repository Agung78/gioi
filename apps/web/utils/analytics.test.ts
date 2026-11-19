import { describe, expect, it } from 'vitest'
import { gateEvent, isStaffPath, venueOfPath } from './analytics'

type Event = { properties?: Record<string, unknown> }

describe('isStaffPath', () => {
  it('matches staff paths', () => {
    expect(isStaffPath('/admin')).toBe(true)
    expect(isStaffPath('/admin/settings')).toBe(true)
    expect(isStaffPath('/login')).toBe(true)
    expect(isStaffPath('/guests/x')).toBe(true)
  })
  it('does not match non-staff paths', () => {
    expect(isStaffPath('/hostel')).toBe(false)
    expect(isStaffPath('/bali')).toBe(false)
    expect(isStaffPath('/')).toBe(false)
  })
})

describe('venueOfPath', () => {
  const slugs = ['bali']
  it('returns first segment when in slugs', () => {
    expect(venueOfPath('/bali/book', slugs)).toBe('bali')
  })
  it('returns undefined otherwise', () => {
    expect(venueOfPath('/', slugs)).toBeUndefined()
    expect(venueOfPath('/privacy', slugs)).toBeUndefined()
  })
})

describe('gateEvent', () => {
  const slugs = ['bali']
  it('drops staff events', () => {
    expect(gateEvent({ properties: { $pathname: '/admin/settings' } } as unknown as Event, slugs)).toBeNull()
    expect(gateEvent(null, slugs)).toBeNull()
  })
  it('tags venue from pathname when unset', () => {
    const cp = gateEvent({ properties: { $pathname: '/bali/book' } } as unknown as Event, slugs)
    expect(cp?.properties?.venue).toBe('bali')
  })
  it('keeps an explicit pre-set venue', () => {
    const cp = gateEvent({ properties: { $pathname: '/bali/book', venue: 'other' } } as unknown as Event, slugs)
    expect(cp?.properties?.venue).toBe('other')
  })
})
