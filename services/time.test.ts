import { describe, expect, it } from 'vitest'

import { formatRelativeTime } from './time'

describe('formatRelativeTime', () => {
  it('returns Just now for missing/invalid dates', () => {
    expect(formatRelativeTime(undefined, 0)).toBe('Just now')
    expect(formatRelativeTime('not-a-date', 0)).toBe('Just now')
  })

  it('formats minutes, hours and days', () => {
    const now = Date.parse('2026-01-05T12:00:00Z')
    expect(formatRelativeTime('2026-01-05T11:59:30Z', now)).toBe('Just now')
    expect(formatRelativeTime('2026-01-05T11:00:00Z', now)).toBe('1h ago')
    expect(formatRelativeTime('2026-01-04T12:00:00Z', now)).toBe('1d ago')
  })
})
