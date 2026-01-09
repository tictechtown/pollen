# Conditional feed fetching + cache headers

## Action plan

- Extend the Feed schema and type to persist cache metadata: `expiresTS`, `expires`, `ETag`, `lastModified`.
- Teach the feed fetcher to parse caching headers (`Cache-Control`, `Expires`, `ETag`, `Last-Modified`) and return them alongside the parsed feed payload.
- Use conditional requests (`If-None-Match`, `If-Modified-Since`) on subsequent fetches when values are present.
- Respect a minimum refresh time derived from headers (skip/defers fetches until `expiresTS`).
- Add unit coverage for header parsing, conditional request behavior, and refresh skipping logic.

## Goals

- Avoid unnecessary feed downloads by reusing HTTP caching headers.
- Honor server-provided refresh windows without blocking manual refreshes.
- Preserve existing refresh flow and article-upsert behavior when content changes.

## Requirements

- DB Feed table gains: `expiresTS` (INTEGER epoch ms), `expires` (TEXT), `ETag` (TEXT), `lastModified` (TEXT).
- `fetchFeed` adds conditional headers on subsequent requests when the feed has `ETag` and/or `lastModified`.
- If the response is `304 Not Modified`, do not parse XML; return a result that updates cache metadata only.
- Minimum fetch timing is derived from response headers:
  - `Cache-Control` can contain multiple directives; parse comma-delimited values and extract `max-age` or `s-maxage` (prefer `max-age` when both exist).
  - `Cache-Control: max-age=N` or `s-maxage=N` should set `expiresTS = now + N * 1000`.
  - If `Cache-Control` is malformed (e.g., uses `;` delimiters), treat as `max-age=0`.
  - `Expires` should set `expiresTS` based on server time; prefer `max-age`/`s-maxage` if both exist.
  - If no usable headers exist, do not set `expiresTS` (fall back to existing refresh cadence).
- Manual refresh should ignore `expiresTS`, but background/foreground refresh should skip feeds that have not expired.
- Persist updated header values after every successful fetch (including 304).

## Architecture / implementation

- Schema + type updates:
  - Update `types/index.ts` Feed type to include new fields.
  - Extend SQLite schema in `services/database.ts` with `ensureColumn` for the new columns.
  - Update `services/feeds-db.ts` upsert statement to read/write the new fields and preserve existing values when undefined.
- Feed fetcher changes (`services/rssClient.ts`):
  - Add optional `cache` options to `fetchFeed` to pass current `ETag`, `lastModified`.
  - Build request headers with `If-None-Match` and `If-Modified-Since` when present.
  - Parse response headers and return a `cache` object with `ETag`, `lastModified`, `expires`, `expiresTS`.
  - `Cache-Control` parsing should tolerate mixed directives and casing; treat malformed values as zero.
  - If status is 304, short-circuit parsing and return `{ feed: existingFeedWithCache, articles: [] }` or a structured result consumed by refresh logic.
- Refresh workflow changes (`services/refresh.ts`):
  - Before fetching, check `feed.expiresTS` vs `Date.now()` and skip fetch when not expired (unless reason is `manual`).
  - Pass cached `etag` and `lastModified` into `fetchFeed`.
  - When `fetchFeed` returns updated cache metadata, include it in the feed upsert data even if there are no new articles.

## Data

- `feeds.expiresTS`: epoch milliseconds used to gate background/foreground refresh.
- `feeds.expires`: raw `Expires` header string for debugging/traceability.
- `feeds.ETag`: raw `ETag` header value; use as-is in `If-None-Match`.
- `feeds.lastModified`: raw `Last-Modified` header value; use as-is in `If-Modified-Since`.

## Testing

- Unit: header parsing for `Cache-Control` + `Expires`, including precedence rules.
- Unit: `Cache-Control` parsing for multi-directive inputs like `private, must-revalidate, max-age=900`, `no-cache, must-revalidate, max-age=0, no-store, private`, and `s-maxage=600`.
- Unit: malformed `Cache-Control` (e.g., `max-age=900; private`) returns `max-age=0`.
- Unit: `fetchFeed` builds conditional headers and handles `304` without parsing.
- Unit: refresh skips unexpired feeds for non-manual refresh; manual refresh bypasses skip.
- Regression: ensure feed metadata still updates on regular 200 responses.

## Risks / mitigations

- Server clock skew can make `Expires` invalid; prefer `max-age` and clamp negative durations to `Date.now()`.
- Some servers return weak `ETag` or malformed dates; treat parse failures as no-cache metadata.
- Conditional requests may return 304 without headers; keep existing cache values in that case.
