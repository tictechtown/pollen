# Plan

Implement the “Share a website to subscribe” journey: from an OS-shared URL, discover RSS/Atom endpoints, let the user pick which feed to follow, then subscribe and navigate to the resulting feed.

## Requirements
- Share entry accepts an http/https URL from the OS share sheet.
- Always presents a feed choice UI (even if only 1 candidate) and clearly labels RSS vs Atom.
- Supports multiple discovered feeds (posts/comments, language variants, RSS + Atom).
- Handles “no feed found” with alternatives: Save link, open in browser, manual feed URL entry.
- Detects duplicates and offers “Open feed” instead of creating another subscription.
- Errors (timeout/parse/no connectivity) are recoverable with retry or alternate actions.

## Scope
- In: discovery helper + UI, subscription creation, dedupe + routing, tests for discovery parsing.
- Out: automatic subscription without user confirmation, background sync tuning.

## Files and entry points
- `app/_layout.tsx` + `services/share-intent.ts` (share routing + URL extraction)
- `app/share.tsx` (discover + selection UI, subscribe, error states)
- `services/rssClient.ts` (add/host discovery helper if not separate)
- `services/feeds-db.ts`, `store/feeds.ts` (persist + state)
- Spec reference: `specs/rss-detection-import.md`, `specs/android-share-actions.md`

## Data model / API changes
- None.

## Action items
[ ] Implement `discoverFeedCandidates(url)` (see `specs/rss-detection-import.md`):
    - if the shared URL is a direct feed, include it as a candidate
    - if it’s an HTML page, parse `<link rel="alternate" type="application/rss+xml|application/atom+xml">`
    - resolve relative URLs against the page URL
[ ] Update `app/share.tsx` “Add as feed” flow to:
    - run discovery first and show a selection list (with RSS/Atom suffix)
    - on selection, call `fetchFeed` and upsert feed + initial articles
    - detect duplicates by `xmlUrl` and offer “Open feed”
[ ] Add a “No feed found” state offering: Save for later, open in browser, manual feed URL entry.
[ ] Add tests for discovery extraction (RSS + Atom + relative URLs + multiple links + none).

## Testing and validation
- Manual: share a site with one feed, with multiple feeds, with none; share a direct RSS URL; share an already-subscribed URL.
- Unit: discovery extraction + candidate labeling.

## Acceptance Criteria (Checklist)
- [ ] Shared website URL discovers RSS/Atom endpoints (when present)
- [ ] User can pick a feed and subscribe successfully
- [ ] Duplicates are detected and do not create another subscription
- [ ] “No feed found” offers sensible alternatives
- [ ] Error states are recoverable and understandable

## Risks and edge cases
- Servers that block `HEAD` or return misleading `content-type` (fall back to GET + parse).
- Some pages place feed links outside `<head>`; consider scanning full HTML when `<head>` is missing.

## Open questions
- None (decisions captured in `specs/journeys/recurring-user-share-feed.md`).

## Related links
- Journey: `specs/journeys/recurring-user-share-feed.md`
- Discovery plan: `specs/rss-detection-import.md`
- Share entry: `specs/android-share-actions.md`
