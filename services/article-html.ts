import type { Article } from '@/types'
import type { MD3Colors, MD3Type, MD3Typescale } from 'react-native-paper/lib/typescript/types'

type BuildArticleHtmlParams = {
  article?: Article
  colors: MD3Colors & {
    surfaceContainerLowest: string
  }
  fonts: MD3Typescale
  displayDate: string
  title?: string
  body: string
}

const WRAP_FIGCAPTIONS_SCRIPT = `
  (function () {
    function wrapXkcdStyleImages() {
      var images = document.querySelectorAll('img[title]:not([data-has-figcaption])')
      for (var i = 0; i < images.length; i++) {
        var img = images[i]
        var title = img.getAttribute('title')
        if (!title) continue

        if (img.closest && img.closest('figure')) {
          img.setAttribute('data-has-figcaption', 'true')
          continue
        }

        var target = img
        var parent = img.parentElement
        if (
          parent &&
          parent.tagName === 'A' &&
          parent.childNodes &&
          parent.childNodes.length === 1
        ) {
          target = parent
        }

        var figure = document.createElement('figure')
        var figcaption = document.createElement('figcaption')
        figcaption.textContent = title

        var insertionParent = target.parentNode
        if (!insertionParent) continue
        insertionParent.insertBefore(figure, target)
        figure.appendChild(target)
        figure.appendChild(figcaption)
        img.setAttribute('data-has-figcaption', 'true')
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wrapXkcdStyleImages)
    } else {
      wrapXkcdStyleImages()
    }
  })()
`

const buildFontTokens = (fontType: MD3Type): string => {
  return `font-size: ${fontType.fontSize}px; line-height: ${fontType.lineHeight}px; letter-spacing: ${fontType.letterSpacing}px; font-weight: ${fontType.fontWeight}`
}

export const buildArticleHtml = ({
  article,
  colors,
  fonts,
  displayDate,
  title,
  body,
}: BuildArticleHtmlParams): string => {
  const hero =
    article?.thumbnail && !body.trimStart().startsWith('<figure')
      ? `<img class="hero" src="${article.thumbnail}" alt="thumbnail" />`
      : ''
  const headerInner = `
      <header class="article-header">
        <div class="time">${displayDate}</div>
        <div class="title">${title ?? ''}</div>
        <div class="source">${article?.source ?? ''} • ${article?.link} </div>
        ${hero}
      </header>
    `
  const headerBlock = article?.link
    ? `<a class="header-link" href="${article.link}">${headerInner}</a>`
    : headerInner

  const result = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { padding-inline: 8px; padding-top:0; padding-bottom: 128px; font-family: -apple-system, Roboto, sans-serif; ${buildFontTokens(fonts.bodyLarge)}; background: ${colors.surfaceContainerLowest}; color: ${colors.onSurface}; }
            main { padding-inline: 8px; margin-top: 8px }
            figure { width: 100%; margin:0; padding:0 }
            figcaption { ${buildFontTokens(fonts.bodySmall)}; color: ${colors.onSurfaceDisabled}; margin-top: 4px}
            img { max-width: 100%; height: auto; border-radius: 24px; }
            video { width: 100%; height: auto; }
            h1, h2, h3, h4 { line-height: 1.2; }
            a { color: ${colors.primary}; text-decoration: underline; }
            a:hover { text-decoration: underline; }
            figure { margin: 0 0 16px 0; }
            iframe { width: 100%; }
            blockquote { border-left: 3px solid ${colors.outlineVariant}; padding-left: 12px; margin-left: 0; color: ${colors.onSurface}; opacity: 0.8; }
            pre { background-color: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant}; white-space: pre; border-radius: 16px; padding: 8px; padding-inline: 12px; overflow-x: auto }
            code {background-color: ${colors.surfaceVariant}; color: ${colors.onSurfaceVariant}}
            
            .article-header { padding: 8px; display: flex;  flex-direction: column; gap: 4px; }
            
            .header-link { color: inherit; text-decoration: none; display: block; -webkit-tap-highlight-color: transparent; }
            .header-link:hover { text-decoration: none;  background: ${colors.surfaceVariant} ; border-radius: 16px }
            .header-link:active { opacity: 0.6; }

            .time { color: ${colors.outline}; ${buildFontTokens(fonts.labelMedium)}; opacity: 0.7; }
            .title { color: ${colors.onSurface}; ${buildFontTokens(fonts.headlineLarge)}; font-weight: bold; }
            .source { color: ${colors.outline}; ${buildFontTokens(fonts.labelMedium)}; opacity: 0.7; word-break: break-all; }
            .hero { width: 100%; border-radius: 24px; height: auto; margin-block: 8px}

            .pane { will-change: transform, opacity; }
            .enter {
              animation: enter-up 200ms cubic-bezier(0, 0, 0.2, 1) 100ms both;
            }
            @keyframes enter-up {
              from { opacity: 0; transform: translateY(20%); }
              to   { opacity: 1; transform: translateY(0); }
            }
          </style>
        </head>
        <body class="pane enter">
          ${headerBlock}
          <main>
          ${body}
          </main>
          <script>
            ${WRAP_FIGCAPTIONS_SCRIPT}
          </script>
        </body>
      </html>
    `
  return result
}
