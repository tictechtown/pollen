# Plan

Implement the “Organize feeds” journey: add/remove subscriptions safely, and manage folders (create/rename/delete) with fast feed assignment, without affecting refresh/sync behavior.

## Requirements

- Add feed from the feed list management flow; errors are recoverable and do not create broken subscriptions.
- Remove feed requires confirmation and removes it from any folder.
- Folder CRUD: create, rename, delete.
- Assign/unassign feeds to folders; move feeds between folders and root.
- Deleting a folder does **not** delete feeds by default; user can optionally delete contained feeds after confirmation.
- Removing a feed keeps any saved items, but “detaches” them (no `feedId`).

## Scope

- In: DB + store for folders, Sources/Feed list management UI, safe delete semantics, tests.
- Out: smart folders/rules, OPML import/export flows.

## Files and entry points

- `app/sources.tsx` (manage feeds + folder UI)
- `components/ui/FeedList.tsx` (folder display/affordances if needed)
- `services/database.ts` (folder tables / migrations)
- `services/feeds-db.ts` (include `folderId`, adjust removal semantics)
- `services/articles-db.ts` (detach saved articles on feed removal)
- `store/feeds.ts`, `store/articles.ts` (state updates)
- New: `services/folders-db.ts`, `store/folders.ts` (if not present yet)
- Spec reference: `specs/feed-folders.md`

## Data model / API changes

- Add `feed_folders` table and `feeds.folderId` column (see `specs/feed-folders.md`).

## Action items

[ ] Implement folder persistence (DB + CRUD helpers) and folder store.
[ ] Update feed upsert/select to include `folderId` and expose folder assignment helpers.
[ ] Build manage/edit UI in `app/sources.tsx`: - create/rename/delete folder dialogs - assign/move feeds (single + optional multi-select) - safe, distinct “Remove from folder” vs “Remove feed” actions
[ ] Update feed removal behavior: - before deleting a feed, set `feedId = NULL` for articles that are saved/starred - then delete the feed and its non-saved articles/statuses
[ ] Add confirmation dialogs: - removing a feed - deleting a folder (ask whether to also delete `<count>` contained feeds)
[ ] Add tests for: folder CRUD + assignment, and feed removal preserving saved articles.

## Testing and validation

- Manual: create folder, move feeds, restart app, delete folder (feeds remain), remove feed (saved items remain in Saved).
- Unit: DB helpers and remove-feed “detach saved” semantics.

## Acceptance Criteria (Checklist)

- [ ] User can add a feed from the feed list flow
- [ ] User can remove a feed with confirmation
- [ ] User can create/rename/delete folders
- [ ] User can assign/move feeds between folders and root
- [ ] Error states are recoverable and understandable
- [ ] Accessibility basics validated

## Risks and edge cases

- Migration safety on existing DBs (use `IF NOT EXISTS` + guarded column adds).
- Large lists: management UI should remain responsive (virtualized list + minimal re-renders).

## Open questions

- None (decisions captured in `specs/journeys/recurring-user-organize-feed.md`).

## Related links

- Journey: `specs/journeys/recurring-user-organize-feed.md`
- Folder spec: `specs/feed-folders.md`
