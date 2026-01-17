import { describe, expect, it } from 'vitest'

import { getListPerformanceProps, LIST_PERFORMANCE_PRESETS } from './listPerformance'

describe('getListPerformanceProps', () => {
  it('returns the small preset for empty or negative lists', () => {
    expect(getListPerformanceProps(0)).toEqual(LIST_PERFORMANCE_PRESETS.small)
    expect(getListPerformanceProps(-5)).toEqual(LIST_PERFORMANCE_PRESETS.small)
  })

  it('returns the medium preset for moderate lists', () => {
    expect(getListPerformanceProps(21)).toEqual(LIST_PERFORMANCE_PRESETS.medium)
    expect(getListPerformanceProps(100)).toEqual(LIST_PERFORMANCE_PRESETS.medium)
  })

  it('returns the large preset for large lists', () => {
    expect(getListPerformanceProps(101)).toEqual(LIST_PERFORMANCE_PRESETS.large)
  })
})
