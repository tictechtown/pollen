// Tests for share intent parsing.
import { describe, expect, it } from 'vitest'

import { parseSharedUrl } from './share-intent'

describe('parseSharedUrl', () => {
  it('extracts URL from intent extra text', () => {
    const encoded = encodeURIComponent('Check this https://example.com/article')
    const raw = `intent://share/#Intent;S.android.intent.extra.TEXT=${encoded};end`

    expect(parseSharedUrl(raw)).toBe('https://example.com/article')
  })

  it('uses the url query param when present', () => {
    const raw = 'https://example.com/share?url=https%3A%2F%2Ffoo.com%2Fbar'

    expect(parseSharedUrl(raw)).toBe('https://foo.com/bar')
  })

  it('falls back to the raw URL when valid', () => {
    const raw = 'https://example.org/post'

    expect(parseSharedUrl(raw)).toBe(raw)
  })
})
