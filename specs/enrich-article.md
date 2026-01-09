# Enrich article plan

## Goals

- Have accurate attributes from article:
  - thumbnail
  - publishedAt
  - description
- Try to grab them from the feed first
- Fallback on HTML headers

## Current state

- We are only doing it for image, using extractImage

## Proposed solution

- Update extractImage to extractMetadata. This method now returns an object of metadata, containing thumbnail, publishedAt and description
- if any of those 3 are missing (or if description is accessed through `['#text']`), fetch the metadata from the associated page.
- Things to do for the metadata page:
  - Check the open graph metadata
  - og:image
  - og:description
  - article:published_time
  - Check the `application/ld+json` microdata:
    - if it's of type Article, you can extract description, image and datePublished

## Decisions / constraints

- Enrichment runs synchronously during refresh; cap at 200 page fetches per refresh to limit cost.
- Only fill blanks; never override feed-supplied values when present.
- No extra enrichment cache needed (articles are filtered by last update).
- Accept JSON-LD types Article/NewsArticle/BlogPosting; ignore others.
- Normalize description to plain text (strip HTML); resolve image URLs to absolute.
- Fetch metadata with a 5s timeout; use a lightweight HEAD first to confirm HTML, then fetch only the head for OG/JSON-LD (no full body fetch). No payload size cap specified.

## Example JSON-LD snippet (Article)

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Gemini 3 Flash is now available in Gemini CLI",
    "description": "Gemini 3 Flash is now available in Gemini CLI. It delivers Pro-grade coding performance with low latency and a lower cost, matching Gemini 3 Pro&#x27;s SWE-bench Verified score of 76%. It significantly outperforms 2.5 Pro, improving auto-routing and agentic coding. It&#x27;s ideal for high-frequency development tasks, handling complex code generation, large context windows (like processing 1,000 comment pull requests), and generating load-testing scripts quickly and reliably.",
    "image": "https://storage.googleapis.com/gweb-developer-goog-blog-assets/images/output_padded.2e16d0ba.fill-800x400.png",
    "datePublished": "2025-12-17",
    "author": [
      { "@type": "Person", "name": "Taylor Mullen", "url": "/search/?author=Taylor+Mullen" }
    ]
  }
</script>
```
