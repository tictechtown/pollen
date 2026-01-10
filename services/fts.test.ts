import { describe, expect, it } from 'vitest'

import { buildFtsPrefixQuery, toPlainTextFromHtml } from './fts'

describe('buildFtsPrefixQuery', () => {
  it('returns empty string for empty input', () => {
    expect(buildFtsPrefixQuery('')).toBe('')
    expect(buildFtsPrefixQuery('   ')).toBe('')
  })

  it('normalizes whitespace and adds prefix operators', () => {
    expect(buildFtsPrefixQuery('  open   ai  ')).toBe('open* ai*')
  })

  it('drops punctuation-only tokens', () => {
    expect(buildFtsPrefixQuery('--- ***')).toBe('')
  })

  it('keeps single-letter tokens without prefix to avoid extremely broad matches', () => {
    expect(buildFtsPrefixQuery('a b c')).toBe('a b c')
  })
})

describe('toPlainTextFromHtml', () => {
  it('returns empty string for empty input', () => {
    expect(toPlainTextFromHtml('')).toBe('')
    expect(toPlainTextFromHtml(null)).toBe('')
  })

  it('extracts readable text from HTML fragments', () => {
    expect(toPlainTextFromHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('decodes HTML entities', () => {
    expect(toPlainTextFromHtml('Fish &amp; Chips')).toBe('Fish & Chips')
  })
})
