# Reader mode plan

## Goals

- Fetch the full article HTML, extract the meaningful content, and render it in a consistent, easy-to-read template.
- Respect current gestures: pull-to-top switches to Reader mode; pull-to-bottom opens the original page.
- Target Android (React Native + native extension friendly); keep JS-first where possible.

## Current state

- Article screen (`app/article/[id].tsx`) renders either the stored RSS `content`/`description` or the remote page in a WebView, but does not fetch/readability-extract the full page.
- DB schema (`services/database.ts`) stores `content`/`description` only; no reader-specific cache or status.
- No extraction pipeline exists; no error or retry model for reader rendering.

## User experience

- Default tab still opens to the RSS body and offers a one-tap “Reader mode” action that kicks off extraction, from the header bar. We do not auto-fetch reader mode on article load.
- App bar actions stay: Reader toggle (left), Original toggle (right), Save toggle. Disable/grey the Reader action while extraction is in-flight.
- Reader template uses Material You-ish typography, comfortable line-height, larger tap targets for links, and honors system dark mode colors.

## Library evaluation (mozilla/readability)

- `mozilla/readability` is pure JS but requires a DOM implementation. No official React Native package exists; Android Java version is part of GeckoView and not trivially embeddable.
- Viable JS approach: bundle `@mozilla/readability` + a lightweight DOM shim such as `linkedom` (lighter than `jsdom`) to run extraction in JS/TS. This keeps us on Expo/React Native without native Gecko dependencies.
- Alternate (fallback) approach: run Readability inside a hidden `react-native-webview` by injecting the Readability script and posting the extracted article back to RN. Works on Android-only too, but is slower and heavier on memory. Keep this as plan B if `linkedom` proves too heavy in bundle size.
- No React Native–specific forks are maintained/active; prioritize upstream `@mozilla/readability` for correctness.

## Extraction pipeline (JS-first, recommended)

1. Triggered when:
   - User taps Reader action (pull-to-top gesture is disabled for now; no prefetch).
2. Fetch HTML from `article.link` with:
   - 8–10s timeout, mobile UA string, follow redirects, gzip support.
   - Abort if payload >5MB (content-length check) to avoid memory blowups.
3. Parse DOM with `linkedom`, run `Readability(document)`, obtain `content`, `title`, `byline`, `excerpt`, `textContent`.
4. Sanitize/normalize:
   - Drop scripts/iframes/style tags; rewrite relative URLs to absolute based on page URL.
   - Keep `<img>` and `<figure>`; lazy-load images to reduce initial cost.
5. Keep reader payload in memory for the current article session only; no persistence or cache. Each tap re-fetches/re-extracts.
6. Status model: `pending` while running, `ok` on success, `failed` with error message stored in memory for retry UX.
7. Fallbacks: if Readability returns null content, set `failed` status and keep RSS `content/description` as the Reader view fallback.

## Rendering

- Reader mode uses in-memory `readerHtml` wrapped in our own template (inline CSS) injected into WebView; no remote assets beyond article images.
- Template basics:
  - Max line width ~700px; line-height 1.6; serif body font (e.g., `"Noto Serif"` if available on Android, fallback to system) with Material You colors from theme passed via template variables.
  - Sticky header for title/byline/published date; large first paragraph margin; comfortable link styling.
  - Optional “Open original” button inside the reader page for redundancy.
- Original mode remains a straight WebView to `article.link`.

## Errors and retries

- Timeouts and `failed` status keep the UI interactive; allow manual retry via Reader action or pull-to-top.
- Respect offline: if offline, skip extraction, show “Reader unavailable offline” toast, and render RSS body.
- On 4xx/5xx, do not retry automatically; allow manual retry only.

## Testing

- Unit: extraction function with fixture HTML (short article, paywall marker, gallery-heavy page) asserting that `readerHtml` is present and sanitized.
- Integration: instrumentation test for Article screen toggling modes, ensuring reader HTML is fetched on tap and failures show fallback + toast.
