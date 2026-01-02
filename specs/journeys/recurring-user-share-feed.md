---
journey: 'recurring-user-share-feed'
title: 'Recurring user: share a website to subscribe to its RSS feed'
status: 'draft'
owner: '<person/team>'
last_updated: '2026-01-02'
platforms: ['ios', 'android']
persona: 'Returning user subscribing to a new feed from a shared website link'
---

# Journey: Recurring user — share a website to subscribe to its RSS feed

## Summary

- **User goal:** Subscribe to a site’s RSS feed from a shared website URL.
- **Primary success:** A feed subscription is created and appears in the feed list.
- **Key screens:** Share sheet → Discover feed → Confirm subscription → Feed details/list

## Preconditions

- App installed; user has previously used it at least once.

## Entry Points (Triggers)

- OS share sheet (from a browser or any app with a web URL).

## Happy Path

| Step | User intent/action         | System behavior                                                             | UI/screen                   | Data/state changes        |
| ---- | -------------------------- | --------------------------------------------------------------------------- | --------------------------- | ------------------------- |
| 1    | Tap Share → select the app | Launch the app and receive URL                                              | Discover feed (loading)     | none                      |
| 2    | Review discovered feed(s)  | Fetch page and autodiscover RSS/Atom endpoints; always ask user to pick one | Feed selection dialog       | none                      |
| 3    | Confirm subscription       | Create subscription and start initial sync                                  | Subscribe / Progress        | Feed subscription created |
| 4    | View the feed (optional)   | Navigate to feed view                                                       | Feed details / Article list | Sync status updated       |

## Alternate Flows

### A1: Multiple feeds discovered

| Step | User intent/action          | System behavior               | UI/screen     | Notes                                           |
| ---- | --------------------------- | ----------------------------- | ------------- | ----------------------------------------------- |
| 1    | Choose which feed to follow | Present list with titles/URLs | Discover feed | Example: “Posts”, “Comments”, language variants |

### A2: No feed discovered

| Step | User intent/action            | System behavior           | UI/screen     | Notes                                                       |
| ---- | ----------------------------- | ------------------------- | ------------- | ----------------------------------------------------------- |
| 1    | Share a site without RSS/Atom | Fail discovery gracefully | No feed found | Offer “Save link”, “Open in browser”, “Try manual feed URL” |

### A3: Feed already subscribed

| Step | User intent/action                    | System behavior  | UI/screen | Notes                                         |
| ---- | ------------------------------------- | ---------------- | --------- | --------------------------------------------- |
| 1    | Share a site already in subscriptions | Detect duplicate | Subscribe | Offer “Open feed” instead of creating another |

## Error Handling

- **Cold start + slow network:** Show “Looking for feeds…” with cancel/back; avoid freezing the share flow.
- **No connectivity:** Offer “Save link” or “Try again later”; don’t create a broken subscription.
- **Timeout / parse failure:** Show retry and allow manual feed URL entry.

## Open Questions

- If discovery finds both RSS and Atom, do we show both in the selection dialog or group them?
  - We show both, and we add the suffix (Atom) or (RSS) for the file names
