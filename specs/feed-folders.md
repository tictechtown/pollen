# Feed folders management (v1.0.11)

## Action plan

- Introduce a feed folder data model (folders table + folderId on feeds).
- Add CRUD helpers and store state for folders.
- Update the Sources screen to create/rename/delete folders and assign feeds.
- Wire filters so selecting a folder can scope the feed list if needed.
- Add tests and migration coverage.

## Goals

- Users can group feeds into folders and manage them.
- Folder assignments persist across launches and refreshes.
- New UI uses Material You components consistent with the app.

## Requirements

- Create folder, rename folder, delete folder.
- Assign/unassign a feed to a folder.
- Deleting a folder unassigns its feeds (feeds are not deleted).
- Default "All" view still shows every feed.

## Data model

### Tables

`feed_folders`

| Column      | DB type | TS type | Notes                |
| ----------- | ------- | ------- | -------------------- |
| `id`        | TEXT    | string  | Primary key.         |
| `title`     | TEXT    | string  | Folder display name. |
| `createdAt` | INTEGER | number  | Unix seconds.        |

`feeds` (existing)

| Column     | DB type | TS type        | Notes                             |
| ---------- | ------- | -------------- | --------------------------------- |
| `folderId` | TEXT    | string \| null | Optional FK to `feed_folders.id`. |

### Types

```ts
type FeedFolder = {
  id: string
  title: string
  createdAt: number
}

type Feed = {
  // ...existing fields
  folderId?: string
}
```

## Implementation outline

- `services/database.ts`: create `feed_folders` table; `ensureColumn` for `feeds.folderId`.
- `services/folders-db.ts`: CRUD for folders and assignment helpers (set feed folderId).
- `services/feeds-db.ts`: include `folderId` in upsert/select.
- `store/folders.ts`: zustand store for folder list.
- `store/filters.ts`: add `selectedFolderId` if folder-level filtering is needed.
- `app/sources.tsx`: folder list + actions (create/rename/delete), assign feed to folder (dialog or overflow menu).
- Optional: `components/ui/FolderListItem.tsx` for a reusable row.

## Testing

- Unit: folder CRUD + feed assignment persistence.
- Integration/manual:
  - Create folder, assign feed, restart app -> assignment persists.
  - Delete folder -> feeds remain and appear in "All".
  - Rename folder -> UI updates immediately.

## Risks / mitigations

- Migration on existing DB: guard with `IF NOT EXISTS` and `ensureColumn`.
- UI complexity: keep folder actions in Sources and reuse existing dialogs.
- Sorting: define explicit `sortOrder` to keep stable ordering.
