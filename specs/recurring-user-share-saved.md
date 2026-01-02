# Plan

Implement and validate the “Share an article to save” journey: from an OS-shared URL, save it immediately for later reading, enrich metadata opportunistically, and handle duplicates and non-article URLs gracefully.

## Requirements
- Share entry accepts an http/https URL from the OS share sheet.
- Saving is fast: persist immediately (URL-only if needed) and confirm success.
- Saved items appear in the Saved tab; duplicates show “Already saved” and offer “Open/View Saved”.
- Offline/no connectivity: save URL now, enrich later when possible; fetch failures do not block saving.
- Non-article URLs: attempt light classification; allow “Save anyway” and suggest “Subscribe” if an RSS feed is discoverable.
- Unsupported URLs (non-http/https): explain and allow cancel/copy.

## Scope
- In: save flow UX, dedupe and metadata enrichment, optional “discover feed” prompt, tests.
- Out: full reader extraction, bulk backfills, editing saved metadata.

## Files and entry points
- `app/share.tsx` (save UI + confirmations)
- `services/save-for-later.ts` (save + dedupe + enrichment behavior)
- `services/rssClient.ts` (`fetchPageMetadata`, optional discovery helper reuse)
- `services/articles-db.ts`, `store/articles.ts` (persistence + local updates)
- Spec reference: `specs/save-lone-articles.md`, `specs/android-share-actions.md`

## Data model / API changes
- None (saved-only articles use `feedId = NULL`).

## Action items
[ ] Audit current share-save flow against the journey:
    - confirm it saves before metadata fetch and tolerates offline/timeout
    - ensure duplicate UX offers “Open/View Saved”
[ ] Add “unsupported URL” guardrails (non-http/https) with copy/cancel actions.
[ ] Add optional feed discovery prompt for non-article pages:
    - if discovery finds RSS/Atom, ask “This page has an RSS feed—import it?” (no auto-subscribe)
[ ] Add tests for save-for-later: dedupe, offline metadata failure fallback, minimal-article persistence.

## Testing and validation
- Manual: share article URL online/offline; share same URL twice; share a non-http URL; share a homepage with an RSS feed.
- Unit: save-for-later dedupe + metadata fallback.

## Acceptance Criteria (Checklist)
- [ ] Share-save works on cold start and warm start
- [ ] Saved items show up in Saved list with clear confirmation
- [ ] Duplicates show “Already saved” and do not create duplicates
- [ ] Offline/metadata failures do not block saving
- [ ] Non-http(s) URLs are rejected with a recoverable UX

## Risks and edge cases
- Some pages are slow/heavy; keep metadata fetch time-bounded and non-blocking for saving.
- URL normalization affects dedupe; be consistent with `normalizeUrl`.

## Open questions
- None (decision captured in `specs/journeys/recurring-user-share-saved.md`).

## Related links
- Journey: `specs/journeys/recurring-user-share-saved.md`
- Existing plan: `specs/save-lone-articles.md`
- Share entry: `specs/android-share-actions.md`
