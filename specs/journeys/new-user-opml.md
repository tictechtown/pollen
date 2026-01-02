---
journey: 'new-user-opml'
title: 'New user: import subscriptions via OPML'
status: 'draft'
owner: '<person/team>'
last_updated: '2026-01-02'
platforms: ['ios', 'android']
persona: 'First-time user migrating from another RSS app'
---

# Journey: New user — import via OPML

## Summary

- **User goal:** Bring existing subscriptions into the app quickly.
- **Primary success:** OPML import completes with at least 1 feed added.
- **Key screens:** Onboarding/Empty state → Import OPML → Import review → Feed list

## Preconditions

- User has an OPML file accessible on device (Files/Downloads/etc.).

## Entry Points (Triggers)

- App icon (first launch)
- Onboarding CTA "Import OPML"

## Happy Path

| Step | User intent/action    | System behavior             | UI/screen                | Data/state changes   |
| ---- | --------------------- | --------------------------- | ------------------------ | -------------------- |
| 1    | Open the app          | Show onboarding/empty state | Onboarding / Empty state | none                 |
| 2    | Choose "Import OPML"  | Open file picker            | Import OPML              | none                 |
| 3    | Select OPML file      | Parse + preview results     | Import review            | staged subscriptions |
| 4    | Confirm import        | Create subscriptions + sync | Import progress          | feeds created        |
| 5    | Browse imported feeds | Show feed list              | Feed list                | none                 |

## Alternate Flows

### A1: OPML parse error

| Step | User intent/action  | System behavior                 | UI/screen   | Notes                         |
| ---- | ------------------- | ------------------------------- | ----------- | ----------------------------- |
| 1    | Select invalid file | Show error + “Try another file” | Import OPML | Provide supported format hint |

## Open Questions

- Do we deduplicate feeds on import (by canonical URL), and how do we report merges?
  - If multiple feeds have the same xmlUrl, only keep one
