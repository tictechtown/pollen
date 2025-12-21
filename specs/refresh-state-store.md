# Global refresh state (v1.0.12)

## Action plan
- Create a global refresh store with status, error, and timestamps.
- Move refresh side effects out of `useArticles` into the global store.
- Update all UI triggers to use the shared refresh action.

## Goals
- One source of truth for loading/error state and last refresh time.
- No duplicate refresh logic across tabs.

## Requirements
- Status: idle/loading/error with `lastRefreshAt` and `lastError`.
- Single in-flight refresh at a time.
- Works for manual refresh, foreground refresh, and background refresh triggers.

## Implementation outline
- `store/refresh.ts`: zustand store with `status`, `lastRefreshAt`, `lastError`, `refresh()` and `hydrate()` helpers.
- `services/refresh.ts`: keep `refreshInFlight` but expose refresh helpers for the store.
- `app/_layout.tsx`: use store `refresh()` for foreground refresh; update snackbars based on store state.
- `hooks/useArticles.ts`: remove local `loading/error` state; use store state; keep pagination logic.
- `components/ui/FeedList.tsx`: `RefreshControl` uses global `status === 'loading'` and `refresh()`.
- Optional: show `lastRefreshAt` in UI (Appbar subtitle or banner).

## Testing
- Manual: pull to refresh, foreground switch, and tab switch -> same spinner and error handling.
- Unit: store transitions for success and failure.

## Risks / mitigations
- Regression in initial hydration: keep `hydrateArticlesAndFeeds` in store and call on mount.
- Race conditions with selected feed filters: include `selectedFeedId` in refresh/hydrate calls.
