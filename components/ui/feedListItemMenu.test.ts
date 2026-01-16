import { describe, expect, it } from 'vitest'

import { getReadMenuLabel, getSavedMenuLabel } from './feedListItemMenu'

describe('getReadMenuLabel', () => {
  it('returns the read label when the article is unread', () => {
    expect(getReadMenuLabel(false)).toBe('Mark as read')
  })

  it('returns the unread label when the article is read', () => {
    expect(getReadMenuLabel(true)).toBe('Mark as unread')
  })
})

describe('getSavedMenuLabel', () => {
  it('returns the read later label when the article is not saved', () => {
    expect(getSavedMenuLabel(false)).toBe('Read Later')
  })

  it('returns the remove label when the article is saved', () => {
    expect(getSavedMenuLabel(true)).toBe('Remove from Read Later')
  })
})
