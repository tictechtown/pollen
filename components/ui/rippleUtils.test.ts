import { describe, expect, it } from 'vitest'

import { getRippleDiameter } from './rippleUtils'

describe('getRippleDiameter', () => {
  it('returns 0 for empty layouts', () => {
    expect(getRippleDiameter({ width: 0, height: 100 }, { x: 0, y: 0 })).toBe(0)
    expect(getRippleDiameter({ width: 100, height: 0 }, { x: 0, y: 0 })).toBe(0)
  })

  it('covers the farthest corner from the center', () => {
    const diameter = getRippleDiameter({ width: 100, height: 50 }, { x: 50, y: 25 })
    expect(diameter).toBeCloseTo(111.8, 1)
  })

  it('covers the farthest corner from an edge', () => {
    const diameter = getRippleDiameter({ width: 100, height: 50 }, { x: 0, y: 0 })
    expect(diameter).toBeCloseTo(223.6, 1)
  })
})
