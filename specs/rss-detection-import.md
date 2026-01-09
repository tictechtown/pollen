# Plan

Define a feed-discovery flow that accepts a user URL, detects direct RSS/Atom feeds, or discovers feed links from HTML head tags, then integrates that flow into the add-source dialog and share flow with clear user choices and errors.

## Requirements

- If the URL is a valid RSS or Atom feed, import it directly.
- If the URL is a regular page, parse `<link>` tags in the `<head>` for `type="application/rss+xml"` (and `application/atom+xml`) and extract absolute URLs.
- If multiple feed links are found, show a dialog listing them and let the user choose.
- If no feed links are found, show a user-facing error.

## Scope

- In: Feed discovery helper, UI flow updates in add feed and share, errors and selection dialog, basic tests.
- Out: Server-side feed proxying, caching, or any changes to feed parsing itself.

## Files and entry points

- `app/sources.tsx` (add-feed dialog flow)
- `services/rssClient.ts` (feed fetch/parse; may add a discovery helper or new service file)
- `components/ui/...` (optional: a reusable “select feed” dialog)

## Data model / API changes

- None (reuse `Feed` and existing `fetchFeed` parsing).

## Action items

[ ] Add a discovery helper (e.g., `discoverFeedUrls(url)`): - HEAD request to check `content-type`; if XML-ish, try `fetchFeed`. - Otherwise GET page, extract `<head>`, and parse `<link rel="alternate" type="application/rss+xml|application/atom+xml" href="...">` into absolute URLs.
[ ] Update `handleAdd` in `app/sources.tsx` to call discovery first, then: - If a direct feed: proceed with existing `fetchFeed` + DB upsert. - If multiple candidates: open a dialog with choices and only fetch after selection. - If none: show snackbar error.
[ ] Add unit tests for link extraction (RSS and Atom, relative URLs, multiple links, missing head).
[ ] Ensure error handling covers: failed HEAD/GET, invalid URLs, non-XML feeds, network timeouts.

## Testing and validation

- Run existing tests (`npm test` or relevant test runner) after adding new tests.
- Manual check: add feed via URL (direct feed), add via site URL with single RSS link, add via site URL with multiple links, add via site URL with none (error).

## Risks and edge cases

- Some servers block HEAD or return misleading `content-type`; need fallback to GET + parse.
- HTML head may be missing or malformed; fallback to scanning full HTML.
- Relative feed URLs must resolve against the provided page URL.

## Open questions

- Accept Atom links (`application/atom+xml`) alongside RSS.
- When multiple links are found, display titles (if present) alongside URLs.
