// Tests for reader-mode extraction helpers.
import { describe, expect, it } from 'vitest'

import { extractReaderFromHtml } from './reader'

describe('extractReaderFromHtml', () => {
  const baseUrl = 'https://example.com/posts/123'

  it('returns readable content with absolute media URLs', () => {
    const html = `
      <!doctype html>
      <html>
        <head><title>Sample</title></head>
        <body>
          <div id="main">
            <h1>Test title</h1>
            <div class="content">
              <p>Hello reader</p>
              <p>More body text to satisfy readability scoring.</p>
              <img src="/images/pic.jpg" />
              <script>evil()</script>
            </div>
          </div>
        </body>
      </html>
    `

    const result = extractReaderFromHtml(html, baseUrl)
    expect(result).not.toBeNull()
    expect(result?.html).toContain('Hello reader')
    expect(result?.html).not.toContain('<script>')
    expect(result?.html).toContain('https://example.com/images/pic.jpg')
  })

  it('returns null when no readable content is found', () => {
    const html = '<html><body></body></html>'
    const result = extractReaderFromHtml(html, baseUrl)
    expect(result).toBeNull()
  })
})
