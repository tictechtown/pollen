import { describe, expect, it } from 'vitest'

import { toggleArticleMode } from './article-mode'

describe('toggleArticleMode', () => {
  it('toggles rss to reader', () => {
    expect(toggleArticleMode('rss')).toBe('reader')
  })

  it('toggles reader to rss', () => {
    expect(toggleArticleMode('reader')).toBe('rss')
  })
})
