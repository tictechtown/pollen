# Android share actions (v1.0.7)

## Action plan
- Add two Android share receivers: (1) add URL as a feed, (2) save URL as an article.
- Wire intent filters in `app.json/app.config` so the app appears in the share sheet for `ACTION_SEND` with `text/plain` and URL payloads.
- Add a lightweight share-handling screen/router entry that reads the incoming intent, validates the URL, and routes to either feed-add flow or saved-article insertion.
- Ensure duplicates are handled gracefully and users get confirmation/error toasts.
- Add tests for the handler logic; document manual QA steps on device/emulator.

## Goals
- When a user shares a link from another app on Android, our app shows two actions:
  1. "Add as feed" → append the URL to feeds list (if valid feed) and refresh.
  2. "Save for later" → store the URL as a saved article entry.
- Handle both when app is cold-started and when it is already running in background.

## Requirements
- Intent filters:
  - `android.intent.action.SEND` with `android.mimeType="text/plain"`.
  - Categories: DEFAULT, BROWSABLE.
  - Exported activity set to true for share receiving.
- UX:
  - Landing screen/modal shows the shared URL and two buttons: "Add feed" and "Save for later".
  - Provide success/failure toasts; auto-dismiss on success.
- Validation:
  - Ensure URL is well-formed HTTP(S); reject others.
  - For add-feed: verify the feed fetch succeeds (e.g., via existing `rssClient`), dedupe by feed URL/id.
  - For save-article: create a minimal Article with `saved: true`, normalized `id` from URL (e.g., base64 url-safe), and insert into store/DB without requiring feed metadata; fetch metadata opportunistically if available.
- Dedupe:
  - If feed already exists, surface "Already added" toast and no-op.
  - If article already saved, surface "Already saved" toast and no-op.

## Implementation outline
- Config:
  - Update `app.json` -> `expo.android.intentFilters` to include the SEND/text filter.
  - Ensure the main activity is marked `android:exported="true"` (Expo handles, but verify).
- Routing:
  - Add a route (e.g., `/share`) that is the intent filter target.
  - In `app/_layout` or a new `ShareHandler` component, read the initial URL/intent via `Linking.getInitialURL` + `Linking.addEventListener('url')` or `IntentLauncher` helpers if needed.
  - Parse out the shared text/URL (from intent extras `android.intent.extra.TEXT`); pass to the handler screen.
- Actions:
  - "Add feed": call existing feed add flow (`services/feeds-db.ts`/opml import) and then trigger a refresh; show toast on result.
  - "Save for later": create/update Article in store/DB with `saved=true`, `source` set to hostname, `title` fallback to URL, `link` = URL; enqueue metadata fetch if available.
- State handling:
  - Guard against multiple submissions; disable buttons while processing.
  - After a successful action, close the handler screen or navigate to the relevant tab.

## Testing
- Unit: URL validation and dedupe helpers; article id generation from URL; handler returns correct status messages.
- Integration (device/emulator):
  - Share a valid RSS URL → app listed → add feed succeeds and shows toast.
  - Share a regular article URL → "Save for later" creates entry and appears in Saved tab.
  - Share an already-added feed/article → shows "Already added/saved" and no duplicate.
  - Cold start vs warm start flows.

## Risks / mitigations
- Intent parsing differences across OEMs: prefer reading both `text/plain` extra and data URI; fallback to regex URL extraction.
- User cancels before choosing action: ensure safe defaults and no DB writes until a button is pressed.
- Permissions/config drift: verify `app.json` merges with existing intent filters; add E2E check in release checklist.
