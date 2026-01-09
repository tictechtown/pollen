# Plan

Add support for saving shared non-feed URLs as standalone Articles with metadata, using the existing share flow and enrichment utilities. Keep saved articles visible in Saved and All lists, with an optional virtual feed only if you want a dedicated filter.

## Requirements

- Accept shared URLs, normalize/dedupe by id, and persist `saved=true` Articles.
- Populate title/source/description/thumbnail/publishedAt from OG/JSON-LD when possible, with URL/hostname fallback.
- Saved articles appear in the Saved tab and All list without breaking refresh.
- Handle duplicates, invalid URLs, and metadata failures gracefully.

## Scope

- In: share save flow, metadata fetch helper, optional virtual feed handling, tests.
- Out: full reader extraction, bulk backfill, new UI for editing metadata.

## Files and entry points

- `app/share.tsx` share save flow and UI feedback.
- `services/rssClient.ts` metadata helpers to reuse or export.
- `services/articles-db.ts` article upsert and saved status handling.
- `services/refresh.ts` skip virtual feeds if introduced.
- `services/feeds-db.ts` optional virtual feed upsert.
- `services/database.ts` optional schema change for feed type.
- `store/articles.ts` local updates for enrichment.
- `store/feeds.ts` and `store/filters.ts` optional virtual feed filtering.
- `types/index.ts` if adding new feed fields.

## Data model / API changes

- Keep `articles.feedId` nullable for saved-only articles; no schema change.

## Action items

[ ] Document nullable `feedId` behavior and ensure downstream filtering tolerates `feedId: null`.
[ ] Extract/export a `fetchPageMetadata(url)` helper (reuse OG/JSON-LD parsing) that returns `title`, `description`, `thumbnail`, `publishedAt`, `source`.
[ ] Update `app/share.tsx` save flow: insert a minimal saved Article immediately, then synchronously fetch metadata and `upsertArticles`/`upsertArticleLocal` to fill in fields without clearing `saved`.
[ ] Ensure hydration keeps saved-only articles visible; adjust filters if needed.
[ ] Add tests for metadata parsing helper and share save behavior (dedupe, fallback, enrichment).

## Testing and validation

- `npm test` (new metadata helper tests + share save behavior).
- Manual (Android): share a URL -> Saved tab shows title/description/thumbnail; share again -> "Already saved"; invalid URL -> error toast.
- Manual: open a saved article -> reader/original modes still work.

## Risks and edge cases

- Metadata fetch latency; avoid blocking by saving minimal article first and updating async.
- Pages without OG tags or blocked requests; ensure graceful fallback to hostname/URL.
- Virtual feed approach can trigger refresh errors if not filtered.

## Open questions

- None.
