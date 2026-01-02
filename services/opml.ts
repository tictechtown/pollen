// OPML parsing + export helpers for feed import/export.
import { XMLParser } from 'fast-xml-parser'
import he from 'he'

import { Feed } from '@/types'
import { generateUUID } from './uuid-generator'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

type OpmlDocument = {
  opml?: {
    body?: {
      outline?: OutlineNode | OutlineNode[]
    }
  }
}

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
      const feedId = generateUUID()
      feeds.push({
        id: feedId,
        xmlUrl: outline.xmlUrl,
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

export const isOpmlXml = (xml: string): boolean => {
  try {
    const parsed = parser.parse(xml) as OpmlDocument
    return Boolean(parsed.opml)
  } catch {
    return false
  }
}

export const parseOpml = (opml: string): Feed[] => {
  const parsed = parser.parse(opml) as OpmlDocument
  const outlines = parsed.opml?.body?.outline
  return collectFeeds(outlines)
}

const escapeXmlAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const formatOpmlDate = (date: Date): string => date.toISOString()

type OpmlExportOptions = {
  title?: string
  dateCreated?: Date
}

export const buildOpml = (feeds: Feed[], options: OpmlExportOptions = {}): string => {
  const title = options.title ?? 'Subscriptions'
  const dateCreated = options.dateCreated ?? new Date()

  const head =
    `  <head>\n` +
    `    <title>${escapeXmlAttribute(title)}</title>\n` +
    `    <dateCreated>${escapeXmlAttribute(formatOpmlDate(dateCreated))}</dateCreated>\n` +
    `  </head>\n`

  const outlines = feeds
    .slice()
    .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
    .map((feed) => {
      const text = feed.title?.trim() || feed.xmlUrl
      const attrs: Array<[string, string]> = [
        ['text', text],
        ['title', text],
        ['type', 'rss'],
        ['xmlUrl', feed.xmlUrl],
      ]
      if (feed.htmlUrl) attrs.push(['htmlUrl', feed.htmlUrl])
      if (feed.description) attrs.push(['description', feed.description])

      const serialized = attrs
        .map(([key, value]) => `${key}="${escapeXmlAttribute(value)}"`)
        .join(' ')

      return `    <outline ${serialized} />`
    })
    .join('\n')

  const body = `  <body>\n${outlines}${outlines ? '\n' : ''}  </body>\n`

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<opml version="2.0">\n` +
    head +
    body +
    `</opml>\n`
  )
}
