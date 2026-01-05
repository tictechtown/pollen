import { describe, expect, it } from 'vitest'

import { shouldOpenExternally } from './webview-navigation'

describe('shouldOpenExternally', () => {
  it('only opens http(s) navigations that differ from the initial url', () => {
    expect(
      shouldOpenExternally({ url: 'about:blank', initialUrl: 'about:blank', lastOpenedUrl: null }),
    ).toBe(false)
    expect(
      shouldOpenExternally({
        url: 'https://example.com',
        initialUrl: 'https://example.com',
        lastOpenedUrl: null,
      }),
    ).toBe(false)
    expect(
      shouldOpenExternally({
        url: 'https://example.com/next',
        initialUrl: 'https://example.com',
        lastOpenedUrl: null,
      }),
    ).toBe(true)
  })

  it('prevents reopening the same url repeatedly', () => {
    expect(
      shouldOpenExternally({
        url: 'https://example.com/next',
        initialUrl: 'https://example.com',
        lastOpenedUrl: 'https://example.com/next',
      }),
    ).toBe(false)
  })
})

