import { describe, expect, it } from 'vitest'

import { buildOpmlExportFilename } from './opml-export'

describe('buildOpmlExportFilename', () => {
  it('builds a stable YYYYMMDD filename', () => {
    expect(buildOpmlExportFilename(new Date('2026-01-05T12:34:56Z'))).toBe(
      'pollen-subscriptions-20260105.opml',
    )
  })
})
