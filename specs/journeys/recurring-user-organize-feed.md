---
journey: 'recurring-user-organize-feed'
title: 'Recurring user: organize feeds (add/remove + folders)'
status: 'draft'
owner: '<person/team>'
last_updated: '2026-01-02'
platforms: ['ios', 'android']
persona: 'Returning user managing subscriptions and keeping the feed list tidy'
---

# Journey: Recurring user — organize feeds

## Summary

- **User goal:** Keep subscriptions up to date and grouped in folders.
- **Primary success:** Feeds can be added/removed, and folders can be created with feeds assigned to them.
- **Key screens:** Feed list → Manage feeds (add/remove) → Folder create/edit

## Context

- **User state:** Recurring user with existing feeds.
- **Motivation:** Clean up the feed list, reduce noise, and group related sources.
- **Constraints:** Needs to be fast and safe (avoid accidental deletes).

## Preconditions

- App installed; at least one existing feed (or user is willing to add one).

## Entry Points (Triggers)

- Feed list → “Manage” / “Edit”
- Feed list → “Add feed”

## Success Criteria

- Adding a feed results in a visible subscription in the feed list.
- Removing a feed removes it from the feed list (and from any folder).
- Creating a folder shows a new folder entry and allows moving/assigning feeds.

## Non-Goals

- Import/export of subscriptions (covered by OPML journeys).
- Advanced rules (filters/smart folders) unless explicitly supported.

## Happy Path

| Step | User intent/action     | System behavior                   | UI/screen                   | Data/state changes       |
| ---- | ---------------------- | --------------------------------- | --------------------------- | ------------------------ |
| 1    | Open the app           | Load current subscriptions        | Feed list                   | none                     |
| 2    | Enter manage/edit mode | Show management UI                | Feed list (edit/manage)     | none                     |
| 3    | Add a feed             | Validate + subscribe              | Add feed                    | new subscription created |
| 4    | Create a folder        | Create folder and show it in list | Create folder dialog/screen | folder created           |
| 5    | Move feeds into folder | Update grouping                   | Feed list (edit/manage)     | feeds assigned to folder |
| 6    | Exit manage/edit mode  | Show updated organization         | Feed list                   | none                     |

## Alternate Flows

### A1: Remove a feed

| Step | User intent/action        | System behavior      | UI/screen             | Notes                                        |
| ---- | ------------------------- | -------------------- | --------------------- | -------------------------------------------- |
| 1    | Choose “Remove” on a feed | Ask for confirmation | Confirm remove dialog | Clarify what happens to saved items/articles |
| 2    | Confirm removal           | Delete subscription  | Feed list             | Feed disappears; remove from any folder      |

### A2: Rename or delete a folder

| Step | User intent/action | System behavior         | UI/screen            | Notes                                      |
| ---- | ------------------ | ----------------------- | -------------------- | ------------------------------------------ |
| 1    | Rename folder      | Update folder name      | Rename folder dialog | Ensure list updates immediately            |
| 2    | Delete folder      | Ask how to handle feeds | Delete folder dialog | Option: move feeds to root vs delete feeds |

### A3: Duplicate folder name

| Step | User intent/action               | System behavior        | UI/screen            | Notes                                |
| ---- | -------------------------------- | ---------------------- | -------------------- | ------------------------------------ |
| 1    | Create folder with existing name | Reject or disambiguate | Create folder dialog | Suggest auto-suffixing or show error |

## Error Handling

- **No connectivity:** Allow organizing (folders/moves) locally; queue sync if needed.
- **Add feed fails:** Show error with retry; don’t create a broken subscription.
- **Partial failure:** Keep list consistent and explain what did/didn’t apply.

## UX Notes

- **Safety:** Confirm destructive actions (remove feed, delete folder).
- **Reversibility:** Prefer “Remove from folder” over “Delete feed” where possible.
- **Speed:** Support quick assign/move patterns (multi-select, drag-and-drop if available).

## Accessibility

- **Screen reader:** Expose folder/feed names, edit controls, and confirmation dialogs clearly.
- **Tap targets:** Ensure edit actions are not tiny (especially delete/remove).

## Acceptance Criteria (Checklist)

- [ ] User can add a feed from the feed list flow
- [ ] User can remove a feed with confirmation
- [ ] User can create/rename/delete folders
- [ ] User can assign/move feeds between folders and root
- [ ] Error states are recoverable and understandable
- [ ] Accessibility basics validated

## Open Questions

- Are folders purely organizational, or do they affect syncing/refresh behavior?
  - purely organizational
- When a folder is deleted, what should happen to feeds inside (move to root by default)?
  - Ask the user via dialog: "Would you like to also delete the `<count>` feeds"
- When a feed is removed, do we keep its saved items/history or remove everything?
  - Keep saved items but marked them as "detached"
