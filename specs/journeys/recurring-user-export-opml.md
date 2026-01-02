---
journey: 'recurring-user-export-opml'
title: 'Recurring user: export subscriptions to OPML'
status: 'draft'
owner: '<person/team>'
last_updated: '2026-01-02'
platforms: ['ios', 'android']
persona: 'Returning user backing up or migrating subscriptions'
---

# Journey: Recurring user — export subscriptions to OPML

## Summary

- **User goal:** Export their feed list to an OPML file (including folders, if used).
- **Primary success:** An OPML file is generated and shared/saved successfully.
- **Key screens:** Settings → Export OPML → Share sheet / Save location

## Context

- **User state:** Recurring user with a non-trivial set of subscriptions.
- **Motivation:** Backup, migrate to another app, or share the list.
- **Constraints:** File permissions and platform differences (iOS/Android sharing).

## Preconditions

- App installed; at least one feed exists.
- User can access a destination (Files app, Drive, email, etc.) via share sheet.

## Entry Points (Triggers)

- Settings → Import/Export → “Export OPML”

## Success Criteria

- OPML output includes all subscribed feeds.
- Folder grouping is preserved when folders exist.
- Export flow ends with a clear confirmation (and/or the platform share UI).

## Non-Goals

- Import (covered by `specs/journeys/new-user-opml.md`).
- Editing subscriptions during export.

## Happy Path

| Step | User intent/action           | System behavior                  | UI/screen             | Data/state changes |
| ---- | ---------------------------- | -------------------------------- | --------------------- | ------------------ |
| 1    | Open Settings                | Load settings and current counts | Settings              | none               |
| 2    | Choose “Export OPML”         | Prepare export                   | Export OPML (loading) | none               |
| 3    | Confirm export               | Generate OPML content            | Export OPML           | none               |
| 4    | Choose where to put the file | Present OS share sheet           | Share sheet           | none               |
| 5    | Complete share/save          | Hand off file successfully       | Return to app         | none               |

## Alternate Flows

### A1: User has no feeds

| Step | User intent/action | System behavior                   | UI/screen   | Notes                     |
| ---- | ------------------ | --------------------------------- | ----------- | ------------------------- |
| 1    | Try to export      | Explain there’s nothing to export | Export OPML | Offer “Add feed” shortcut |

### A2: Export includes folders

| Step | User intent/action          | System behavior                    | UI/screen   | Notes                                                   |
| ---- | --------------------------- | ---------------------------------- | ----------- | ------------------------------------------------------- |
| 1    | Export with folders present | Serialize folders as OPML outlines | Export OPML | Ensure consumers can import even if they ignore folders |

### A3: User cancels share sheet

| Step | User intent/action | System behavior                     | UI/screen              | Notes                                  |
| ---- | ------------------ | ----------------------------------- | ---------------------- | -------------------------------------- |
| 1    | Cancel             | Keep user in app with a clear state | Settings / Export OPML | Offer “Export again” without surprises |

## Error Handling

- **File generation failure:** Show error + retry; avoid producing a partial/invalid file.
- **Share/save failure:** Show error from OS when possible; allow retry.
- **Large lists:** Keep UI responsive; show progress if generation takes noticeable time.

## UX Notes

- **Naming:** Use a predictable filename (e.g. `subscriptions.opml` or date-stamped).
- **Privacy:** Don’t include sensitive user data; only include feed URLs/titles and folder structure.

## Accessibility

- **Dialogs:** Ensure share/export confirmation is accessible and focus is correct on open/close.

## Acceptance Criteria (Checklist)

- [ ] Export from Settings creates a valid OPML file
- [ ] Export includes all feeds
- [ ] Export preserves folder grouping (when folders exist)
- [ ] Cancel and failure cases are handled gracefully
- [ ] Accessibility basics validated

## Open Questions

- Where should the export entry live (Settings root vs Import/Export section)?
  - Import/Export section
- Do we always include folder structure, or only when at least one folder exists?
  - Only when one folder exists
