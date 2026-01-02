---
journey: 'recurring-user'
title: 'Recurring user: read an article from the feed list'
status: 'draft'
owner: '<person/team>'
last_updated: '2026-01-02'
platforms: ['ios', 'android']
persona: 'Returning user catching up on unread items'
---

# Journey: Recurring user — read an article

## Summary

- **User goal:** Find something interesting and read it quickly.
- **Primary success:** Article opens and reading state updates (e.g. read/unread).
- **Key screens:** Feed list → Article list → Article

## Preconditions

- At least one feed exists with at least one available article.

## Entry Points (Triggers)

- App icon (normal launch)

## Happy Path

| Step | User intent/action | System behavior                  | UI/screen    | Data/state changes                   |
| ---- | ------------------ | -------------------------------- | ------------ | ------------------------------------ |
| 1    | Open the app       | Refresh in background/foreground | Feed list    | refresh timestamps, refresh articles |
| 2    | Select a feed      | Load items                       | Article list | none                                 |
| 3    | Tap an article     | Open reader view                 | Article      | mark opened; optionally mark read    |
| 4    | Go back            | Preserve scroll + read state     | Article list | read/unread updated                  |

## Alternate Flows

### A1: No unread articles

| Step | User intent/action | System behavior              | UI/screen    | Notes                         |
| ---- | ------------------ | ---------------------------- | ------------ | ----------------------------- |
| 1    | Open a feed        | Show empty “caught up” state | Article list | Offer “Show all” or “Refresh” |

## Open Questions

- What is the rule for marking as read (on open vs on scroll completion vs explicit action)?
  - An article is marked as read if:
    - the user opens it
    - the user mark it as read explicitely (via a tap)
  - Later on, we can add a settings to mark an article as read when scrolling
