---
journey: 'recurring-user-search'
title: 'Search articles'
status: 'draft' # draft | in-review | approved
owner: 'TicTechTown'
last_updated: '2026-01-09'
platforms: ['ios', 'android']
persona: 'Recurring reader who wants to find an article they saw before'
---

# Journey: Search articles

## Summary

- **User goal:** find a previously seen article by keywords.
- **Primary success:** relevant results appear quickly and the user can open the target article.
- **Key screens:** Feed → Search → Article
- **Time horizon:** daily 5–20 seconds

## Context

- **User state:** recurring user with multiple feeds and hundreds/thousands of articles cached.
- **Motivation:** remember a topic/title but not the exact feed or date.
- **Constraints:** offline usage should still work (local DB), small screen, one-handed.

## Preconditions

- App has at least one feed and at least one article in the local database.
- DB is hydrated (app is past initial loading).

## Entry Points (Triggers)

- Feed tab header: search icon.

## Success Criteria

- Search screen opens with the input focused.
- Typing updates results using local search without noticeable jank.
- Results are relevant and ordered (title matches are prioritized).
- Search scope is clearly communicated under the input (default: current feed).
- User can open an article from the results and return back to the same query/results.

## Non-Goals

- Searching remote servers (v1).
- Full query language UI (advanced operators).

## Happy Path

| Step | User intent/action | System behavior | UI/screen | Data/state changes |
| ---- | ------------------ | --------------- | --------- | ------------------ |
| 1 | User taps search icon from Feed header | Navigate to Search screen | Search screen appears | None |
| 2 | User starts typing a keyword | Debounced search triggers; query hits local SQLite FTS | Results list updates | None |
| 3 | User scrolls results | Fetch next page (50 items) when near end | More results appended | None |
| 4 | User taps a result | Navigate to Article screen for that item | Article opens | Optional: mark read later based on existing behavior |
| 5 | User hits back | Return to Search screen with same query and scroll position (best-effort) | Search screen restored | None |

## Alternate Flows

### A1: No query yet

| Step | User intent/action | System behavior | UI/screen | Notes |
| ---- | ------------------ | --------------- | --------- | ----- |
| 1 | User opens Search | No search runs | Show hint/empty state | Keep input focused |

### A2: No results

| Step | User intent/action | System behavior | UI/screen | Notes |
| ---- | ------------------ | --------------- | --------- | ----- |
| 1 | User types query with no matches | Search returns empty | “No matches” empty state | Suggest shortening the query |

### A3: Search within a specific feed

| Step | User intent/action | System behavior | UI/screen | Notes |
| ---- | ------------------ | --------------- | --------- | ----- |
| 1 | User has a feed filter already active | Search inherits `selectedFeedId` | Results limited to that feed | Optional chip to clear scope (future) |

## Error Handling

- **No connectivity:** search continues to work (local DB only).
- **Empty state:** if there are no articles indexed yet, show “No articles to search yet”.
- **FTS unavailable:** fallback to a slower LIKE-based search, or show a clear error with guidance.
- **Long/invalid query:** trim/normalize; show a gentle message if the query is too long.

## UX Notes

- **Loading:** show a compact progress indicator on first page; avoid full-screen spinners while typing.
- **Copy tone:** short and actionable (“No matches”, “Try fewer words”).
- **Navigation:** back returns to previous screen; clearing the query returns to hint state.

## Accessibility

- **Dynamic type:** search bar and result rows should reflow gracefully.
- **Screen reader:** label the search field; announce results count changes sparingly to avoid noise.
- **Focus order:** on open, focus the search input; after selecting a result, focus the article title.

## Acceptance Criteria (Checklist)

- [ ] Search icon exists on Feed screen header
- [ ] Search screen input auto-focuses and opens the keyboard
- [ ] Search scope label is shown under the input (defaults to current feed)
- [ ] Results are relevance-sorted and paginated (50/page)
- [ ] Search matches title + content (as text)
- [ ] Back navigation restores query/results (best-effort)
- [ ] Works offline

## Open Questions

- Should Search be global by default or scoped to the currently selected feed?
  - Answer: scoped to the current feed filter by default (and clearly labeled under the input). If no feed is selected, search is global (“All articles”).
- Should we include `description` in v1 to improve coverage for feeds that omit full content?
  - Answer: no (v1 searches `title` + `content` only).

## Related Links

- Tech spec: `specs/full-text-search.md`
