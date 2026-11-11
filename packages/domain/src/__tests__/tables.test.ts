import { describe, expect, it } from 'vitest'
import { hasRedundantTable } from '../tables'

describe('hasRedundantTable', () => {
  it('rejects 6+4+4 for 8 pax', () => expect(hasRedundantTable([6, 4, 4], 8)).toBe(true))
  it('rejects a tiny extra table once covered', () => expect(hasRedundantTable([8, 1], 8)).toBe(true))
  it('allows exact and over-covering joins that need every table', () => {
    expect(hasRedundantTable([4, 4], 8)).toBe(false)
    expect(hasRedundantTable([6, 4], 8)).toBe(false)
    expect(hasRedundantTable([4, 4], 7)).toBe(false)
  })
  it('allows a single table of any size', () => expect(hasRedundantTable([8], 2)).toBe(false))
})
