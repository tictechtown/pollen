# Article header -> open original (v1.0.12)

## Action plan

- Make the article header section in RSS/Reader HTML a regular anchor element.
- Use the article link directly via `href`.
- Preserve existing link behavior inside the article body.

## Goals

- Tapping the header (title/source/hero) opens the real page (original mode).

## Requirements

- Works in both RSS and Reader modes.
- Does not break normal links inside the article body.
- If no link is available, show a snackbar.

## Implementation outline

- `app/article/[id].tsx`:
  - Wrap header markup in an anchor with `href` set to `article.link`.
  - Ensure the anchor is only rendered when `article.link` exists; otherwise show snackbar.
- Add a subtle active style in the header CSS (e.g., opacity change on press).

## Testing

- Manual: tap header in RSS/Reader -> opens the original page via the anchor.
- Verify body links still open in WebView as before.
- Android + iOS.

## Risks / mitigations

- Rapid taps while reader is loading: guard if already in original mode.
