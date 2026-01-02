# OPML export (v1.0.11)

## Action plan
- Add an OPML serializer to build XML from feeds.
- Add an export action in Settings to generate and share the OPML file.
- Include folder structure if available.
- Add tests for XML output.

## Goals
- Users can export their feeds to an OPML file for backup/transfer.
- Exported OPML matches common reader formats.

## Requirements
- Output OPML 2.0 with proper `<head>` and `<body>` nodes.
- Each feed uses an outline with `type="rss"` and `xmlUrl`, `htmlUrl`, `title/text`.
- Escape XML entities in titles, descriptions, and URLs.
- Share or save the file (Android + iOS).

## Implementation outline
- `services/opml.ts`: add `buildOpml(feeds, folders?)` and a serializer helper.
- `services/feeds-db.ts`: add helper to load feeds grouped by folder if needed.
- `app/settings.tsx`: add "Export OPML" button; show snackbar on success/error.
- Use `expo-file-system` to write to cache, then:
  - Preferred: `expo-sharing` to open the share sheet.
  - Android fallback: `StorageAccessFramework.createFileAsync` to let the user choose location.
- Use a timestamped filename (e.g., `pollen-feeds-YYYYMMDD.opml`).

## Testing
- Unit: serialize with sample feeds; assert escaping and structure.
- Manual: export on Android/iOS; import into another reader; verify counts.

## Risks / mitigations
- Missing `expo-sharing`: add the dependency if needed; fallback to SAF.
- Character encoding: ensure UTF-8 and escape `& < > "`.
- Folder support: if folders are not implemented yet, export a flat list.
