// OPML parsing helpers for feed import.
import { XMLParser } from 'fast-xml-parser'
import he from 'he'

import { Feed } from '@/types'
import { encodeBase64 } from './rssClient'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

const toArray = <T>(maybe: T | T[] | undefined): T[] => {
  if (!maybe) return []
  return Array.isArray(maybe) ? maybe : [maybe]
}

const decode = (value?: string): string | undefined => {
  if (!value) return value
  return he.decode(value)
}

type OutlineNode = {
  text?: string
  title?: string
  description?: string
  xmlUrl?: string
  htmlUrl?: string
  type?: string
  outline?: OutlineNode | OutlineNode[]
}

const collectFeeds = (node?: OutlineNode | OutlineNode[]): Feed[] => {
  const outlines = toArray(node)

  return outlines.flatMap((outline) => {
    const feeds: Feed[] = []
    if (outline.type === 'rss' && outline.xmlUrl) {
      const feedId = encodeBase64(outline.xmlUrl) ?? outline.xmlUrl
      feeds.push({
        id: feedId,
        url: outline.xmlUrl,
        title: decode(outline.title ?? outline.text) ?? outline.xmlUrl,
        description: decode(outline.description),
      })
    }

    if (outline.outline) {
      feeds.push(...collectFeeds(outline.outline))
    }

    return feeds
  })
}

export const parseOpml = (opml: string): Feed[] => {
  const parsed = parser.parse(opml)
  const outlines = parsed?.opml?.body?.outline
  return collectFeeds(outlines)
}
