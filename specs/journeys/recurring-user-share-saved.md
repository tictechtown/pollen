---
journey: 'recurring-user-share-saved'
title: 'Recurring user: share an article link to save'
status: 'draft'
owner: '<person/team>'
last_updated: '2026-01-02'
platforms: ['ios', 'android']
persona: 'Returning user saving an article from another app'
---

# Journey: Recurring user — share an article link to save

## Summary

- **User goal:** Save an article link for later reading.
- **Primary success:** Link is saved and visible in the “Saved” list, with a clear confirmation.
- **Key screens:** Share sheet → In-app “Add to Saved” → `saved.ts` tab (optional) → Article (optional)

## Preconditions

- App installed; user has previously used it at least once.

## Entry Points (Triggers)

- OS share sheet (from browser/news/social apps).

## Happy Path

| Step | User intent/action         | System behavior                                   | UI/screen              | Data/state changes                    |
| ---- | -------------------------- | ------------------------------------------------- | ---------------------- | ------------------------------------- |
| 1    | Tap Share → select the app | Launch the app and receive URL                    | Add to Saved (loading) | none                                  |
| 2    | Confirm saving             | Validate URL and (optionally) fetch title/preview | Add to Saved           | Create a Saved item                   |
| 3    | View the feed (optional)   | Navigate to "Read Later" tab                      | `saved.ts` tab         | Update recents/last opened (optional) |

## Alternate Flows

### A1: URL already saved

| Step | User intent/action         | System behavior  | UI/screen    | Notes                                                |
| ---- | -------------------------- | ---------------- | ------------ | ---------------------------------------------------- |
| 1    | Share an already-saved URL | Detect duplicate | Add to Saved | Show “Already saved” and offer “Open” / “View Saved” |

### A2: URL is not an article

| Step | User intent/action       | System behavior        | UI/screen    | Notes                                                                     |
| ---- | ------------------------ | ---------------------- | ------------ | ------------------------------------------------------------------------- |
| 1    | Share a non-article page | Attempt classification | Add to Saved | Offer “Save anyway” or suggest “Subscribe to feed” if discovery finds one |

### A3: Unsupported URL (no http/https)

| Step | User intent/action             | System behavior         | UI/screen    | Notes                          |
| ---- | ------------------------------ | ----------------------- | ------------ | ------------------------------ |
| 1    | Share an unsupported link type | Reject with explanation | Add to Saved | Offer “Copy link” and “Cancel” |

## Error Handling

- **Cold start + slow network:** Allow saving immediately using the URL; enrich metadata later when possible.
- **No connectivity:** Save offline (URL only) and mark as “needs preview” until online.
- **Fetch/parse failure:** Save the URL with minimal metadata; avoid blocking success.

## Open Questions

- Should saving an article implicitly subscribe to its feed if one is discoverable?
  - No. Ask the user via Dialog (saying this page has an RSS feed available, would you like to import it)
