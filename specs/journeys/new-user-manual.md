---
journey: 'new-user-manual'
title: 'New user: add first feed manually'
status: 'draft'
owner: '<person/team>'
last_updated: '2026-01-02'
platforms: ['ios', 'android']
persona: 'First-time user who already has an RSS feed URL'
---

# Journey: New user — add first feed manually

## Summary

- **User goal:** Add an RSS feed and read the first article.
- **Primary success:** At least 1 feed is added and 1 article is opened.
- **Key screens:** Onboarding/Empty state → Add feed → Feed details → Article

## Preconditions

- App installed and launched for the first time.

## Entry Points (Triggers)

- App icon (first launch).
- Onboarding CTA "Add feed"

## Happy Path

| Step | User intent/action         | System behavior                    | UI/screen                | Data/state changes   |
| ---- | -------------------------- | ---------------------------------- | ------------------------ | -------------------- |
| 1    | Open the app               | Show onboarding/empty state        | Onboarding / Empty state | none                 |
| 2    | Choose "Add feed"          | Present input for feed URL         | Add feed                 | none                 |
| 3    | Paste feed URL and confirm | Validate + fetch feed metadata     | Add feed (loading)       | pending subscription |
| 4    | Confirm subscription       | Create subscription and start sync | Feed details             | feed created         |
| 5    | Tap an article             | Open reader view                   | Article                  | mark last_opened     |

## Alternate Flows

### A1: Invalid URL / unsupported feed

| Step | User intent/action | System behavior              | UI/screen | Notes                         |
| ---- | ------------------ | ---------------------------- | --------- | ----------------------------- |
| 1    | Submit invalid URL | Show inline error + guidance | Add feed  | Suggest examples, allow retry |

## Error Handling

- **No connectivity:** Keep user on Add feed, show retry; don’t create a broken subscription.
- **Empty feed:** Allow subscription but show empty-state explanation on feed screen.

## Open Questions

- Do we allow adding a feed without immediately syncing (offline-first), or require first fetch to succeed?
  - Always fetch the content first. If offline, display an error message
