import { describe, expect, it } from 'vitest'

import type { Article } from '@/types'

import { buildArticleHtml } from './article-html'

describe('buildArticleHtml', () => {
  const colors = {
    surface: '#fff',
    onSurface: '#000',
    primary: '#00f',
    surfaceVariant: '#eee',
    outlineVariant: '#ddd',
    onSurfaceVariant: '#111',
    outline: '#999',
    scrim: '#f9f9f9',
  } as any
  const fontBase = {
    fontFamily: 'System',
    letterSpacing: 0,
    fontWeight: '400',
    lineHeight: 20,
    fontSize: 16,
  }
  const fonts = {
    bodyMedium: fontBase,
    labelMedium: { ...fontBase, fontSize: 12, lineHeight: 14 },
    headlineLarge: { ...fontBase, fontSize: 24, lineHeight: 28, fontWeight: '700' },
  } as any

  it('wraps the header in a link when article.link is present', () => {
    const html = buildArticleHtml({
      article: {
        id: 'a',
        title: 't',
        link: 'https://example.com/post',
        source: 'Example',
        read: false,
        saved: false,
      } satisfies Article,
      colors,
      fonts,
      displayDate: 'Jan 5',
      title: 'Hello',
      body: '<p>Body</p>',
    })
    expect(html).toContain('class="header-link"')
    expect(html).toContain('href="https://example.com/post"')
  })

  it('renders a hero image when article.thumbnail is present', () => {
    const html = buildArticleHtml({
      article: {
        id: 'a',
        title: 't',
        link: 'https://example.com/post',
        source: 'Example',
        thumbnail: 'https://example.com/hero.jpg',
        read: false,
        saved: false,
      } satisfies Article,
      colors,
      fonts,
      displayDate: 'Jan 5',
      title: 'Hello',
      body: '<p>Body</p>',
    })
    expect(html).toContain('class="hero"')
    expect(html).toContain('src="https://example.com/hero.jpg"')
  })
})
