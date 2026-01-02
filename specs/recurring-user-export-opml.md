# Plan

Implement the “Export OPML” journey from Settings: generate a valid OPML file from current subscriptions (including folders when present) and hand it off to the OS share/save UI with clear success/cancel/error states.

## Requirements
- Export includes all subscribed feeds (title + `xmlUrl`, optional `htmlUrl`/description).
- Export preserves folder grouping when folders exist; otherwise exports a flat list.
- Export works on iOS and Android via share sheet / save location.
- Empty state: if no feeds exist, explain there’s nothing to export and offer a shortcut to add/import.
- Canceling the share sheet is a no-op that leaves the user in a sensible state.

## Scope
- In: OPML serialization, Settings UI entry, platform file/share handling, basic tests.
- Out: OPML import (covered elsewhere), editing feeds during export.

## Files and entry points
- `app/settings.tsx` (export button + UX)
- `services/opml.ts` (add OPML **export** serializer; keep existing parse helpers)
- `services/feeds-db.ts` (load feeds for export; optionally include folder metadata)
- `services/folders-db.ts` (only if folder support exists/ships)
- `specs/opml-export.md` (existing design notes)

## Data model / API changes
- None required for flat export.
- If exporting folders: needs an accessible folder model (see `specs/feed-folders.md`).

## Action items
[ ] Add `buildOpml({ feeds, folders? })` to `services/opml.ts` that emits OPML 2.0 and escapes XML entities.
[ ] Add a DB query/helper to load all feeds (and folders + feed→folder mapping when available) for export.
[ ] Add a Settings entry (Import/Export section) to trigger export:
    - show a confirmation dialog (and an empty-state message when 0 feeds).
    - generate OPML, write a temp file, then open share sheet.
[ ] Implement platform file flow:
    - preferred: `expo-sharing` (share temp `.opml`).
    - Android fallback: `StorageAccessFramework.createFileAsync` if needed.
[ ] Add tests for OPML serialization (flat + folders + escaping).

## Testing and validation
- Unit: serializer output shape, escaping, folders outline nesting.
- Manual: export on iOS + Android, cancel share sheet, export with 0 feeds, import exported file into another reader.

## Acceptance Criteria (Checklist)
- [ ] Export from Settings creates a valid OPML file
- [ ] Export includes all feeds
- [ ] Export preserves folder grouping (when folders exist)
- [ ] Cancel and failure cases are handled gracefully
- [ ] Accessibility basics validated

## Risks and edge cases
- Some consumers are picky about attribute names (`text`, `title`, `xmlUrl`, `htmlUrl`); keep to common OPML conventions.
- Folder export should degrade gracefully for apps that ignore nesting.

## Open questions
- None (decisions captured in `specs/journeys/recurring-user-export-opml.md`).

## Related links
- Journey: `specs/journeys/recurring-user-export-opml.md`
- Prior spec: `specs/opml-export.md`
- Folder model: `specs/feed-folders.md`
