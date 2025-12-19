// Tests for OPML parsing helpers.
import { describe, expect, it } from 'vitest'

import { encodeBase64 } from './rssClient'
import { parseOpml } from './opml'

describe('parseOpml', () => {
  it('extracts feed metadata from OPML', () => {
    const url = 'https://example.com/rss'
    const opml = `<?xml version="1.0"?>
      <opml>
        <body>
          <outline type="rss" xmlUrl="${url}" title="Example Feed" />
        </body>
      </opml>`

    const feeds = parseOpml(opml)

    expect(feeds).toHaveLength(1)
    expect(feeds[0].url).toBe(url)
    expect(feeds[0].id).toBe(encodeBase64(url))
  })
})
