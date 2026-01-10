# Plan: Add Feed via OPML URL

## Summary
Extend the existing "Add Feed" flow to accept an OPML URL in addition to a single RSS/Atom feed URL. This update must apply to both the `sources` screen and the `share` screen, keeping UI/UX aligned and reusing shared logic.

## Goals
- Allow users to add a URL that points to an OPML file.
- Parse OPML and add multiple feeds in one action.
- Preserve current behavior for single-feed URLs.
- Provide clear user feedback for mixed results (some feeds added, some invalid).

## Non-goals
- Local file pickers for OPML (only URL support).
- Export changes (handled in existing OPML export specs).

## User Stories
- As a user, I can paste an OPML URL on the `sources` screen and import all feeds in it.
- As a user, I can share an OPML URL to the app (share screen) and import all feeds in it.
- As a user, I get a summary of what was imported and what failed.

## UX/Behavior
- Input field accepts a URL.
- On submit:
  - Detect if the URL is a feed URL or an OPML URL.
  - If OPML, fetch and parse, then add all valid feeds.
  - If feed URL, keep existing single-feed import behavior.
- Show a progress state (loading indicator) while fetching/parsing.
- Success toast/dialog summary:
  - "Imported X feeds. Y failed."
- For OPML failure:
  - Show a specific error message (invalid OPML, network failure, or no feeds found).

## Technical Approach

### Detection
- Reuse existing feed detection logic if present; otherwise add a lightweight OPML check:
  - Fetch URL content.
  - If XML contains `<opml` or `outline` with `xmlUrl` attributes, treat as OPML.
  - Otherwise fall back to feed handling logic.

### Parsing
- Add or reuse an OPML parser in `services/` (TypeScript).
- Extract `xmlUrl` values from `outline` nodes; ignore duplicates.
- Normalize and validate URLs.

### Integration Points
- `sources` screen "Add Feed" entry point.
- `share` screen "Add Feed" entry point.
- Shared import action/service (new or existing) to avoid duplicate logic.

## Implementation Steps
1. Locate "Add Feed" entry points in `sources` and `share` screens and identify shared logic.
2. Introduce a service function (e.g. `importFromUrl`) that:
   - Fetches URL content.
   - Detects OPML vs feed.
   - Returns a list of feed URLs or single feed URL.
3. Add OPML parsing utility in `services/` and unit tests.
4. Update both screens to use the shared import function and display success/failure summaries.
5. Add UI state for loading and results; keep current UX for single-feed cases.

## Data and Error Handling
- Deduplicate feeds before adding.
- Provide a list of invalid feeds in error summary.
- Preserve existing error messages for single-feed imports where possible.

## Testing
- Unit tests for OPML parsing:
  - Valid OPML with multiple outlines.
  - Nested outlines.
  - Missing `xmlUrl`.
  - Duplicate URLs.
- Integration tests for import from URL:
  - OPML URL adds multiple feeds.
  - OPML URL with some invalid feeds shows mixed result.
  - Non-OPML URL continues single-feed behavior.

## Open Questions
- Should OPML import create folders if `title`/`text` is present in outlines?
- Should we allow HTTP redirects for OPML URLs?
