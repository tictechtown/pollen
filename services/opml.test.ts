// Tests for OPML parsing helpers.
import { describe, expect, it } from 'vitest'

import { XMLParser } from 'fast-xml-parser'

import { buildOpml, parseOpml } from './opml'

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
    expect(feeds[0].xmlUrl).toBe(url)
  })
})

describe('buildOpml', () => {
  it('exports feeds as OPML outlines', () => {
    const opml = buildOpml([
      {
        id: '1',
        title: 'Example Feed',
        xmlUrl: 'https://example.com/1/rss.xml',
        htmlUrl: 'https://example.com',
        description: 'News & updates 1',
      },
      {
        id: '2',
        title: 'Example Feed 2',
        xmlUrl: 'https://example.com/2/rss.xml',
        htmlUrl: 'https://example.com',
        description: 'News & updates 2',
      },
      {
        id: '3',
        title: 'Example Feed 3',
        xmlUrl: 'https://example.com/3/rss.xml',
        htmlUrl: 'https://example.com',
        description: 'News & updates 3',
      },
    ])

    expect(opml).toContain('<opml version="2.0">')
    expect(opml).toContain('xmlUrl="https://example.com/1/rss.xml"')
    expect(opml).toContain('htmlUrl="https://example.com"')
    expect(opml).toContain('description="News &amp; updates 1"')

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
    const parsed = parser.parse(opml) as any
    const outline = parsed.opml?.body?.outline as any[]
    expect(outline).toHaveLength(3)
    expect(outline[2].text).toBe('Example Feed 3')
    expect(outline[2].text).toBe('Example Feed 3')
    expect(outline[2].xmlUrl).toBe('https://example.com/3/rss.xml')
  })

  it('escapes attribute values safely', () => {
    const opml = buildOpml([
      {
        id: '1',
        title: `Fish & "Chips" <Best>`,
        xmlUrl: 'https://example.com/rss.xml?x=1&y=2',
      },
    ])

    expect(opml).toContain('Fish &amp; &quot;Chips&quot; &lt;Best&gt;')
    expect(opml).toContain('xmlUrl="https://example.com/rss.xml?x=1&amp;y=2"')
  })
})
