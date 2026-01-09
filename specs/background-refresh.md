# Background refresh + toast (v1.0.6)

## Action plan

- Add a background task that runs every 30 minutes to refresh feeds/articles using the existing fetch + upsert pipeline.
- Persist a lightweight marker of how many new articles were inserted during the background run.
- On next app foreground/launch, read the marker and show a toast like `"3 new articles"` if >0, then clear the marker.
- Add telemetry/logging hooks to observe failures and success counts; add unit/integration coverage for the new flow.

## Goals

- Refresh feeds in background roughly every 30 minutes on both iOS and Android.
- Avoid duplicate refreshes when the app is foregrounded (one pipeline shared with manual refresh).
- Show a toast once per batch when the user next opens the app if the background run found new items.

## Requirements

- Use Expo `TaskManager` + `BackgroundFetch` (or `expo-background-fetch/next` if available).
- Minimum interval 30 minutes; allow OS to defer when constrained.
- Reuse the existing refresh logic (no separate codepath; gate with a single `refreshArticles({ source: 'background' })`).
- Persist new-article count and timestamp (AsyncStorage key: `background-new-articles-v1`).
- Toast appears only on next foreground and clears the counter after showing.
- Background task should abort quickly if another refresh is in progress (avoid concurrent writes).
- Respect OS background limits; handle denied/unsupported states gracefully with logging only.

## Architecture / implementation

- Task registration: on app start, call `BackgroundFetch.registerTaskAsync(TASK_NAME, { minimumInterval: 30 * 60 })` after checking status via `BackgroundFetch.getStatusAsync()`. Register only once; keep a flag in AsyncStorage to avoid re-registering if unsupported.
- Task handler (TaskManager.defineTask):
  - Acquire a simple in-memory mutex or reuse an existing refresh lock.
  - Invoke the standard refresh pipeline (e.g., `refreshFeedsAndArticles({ background: true })`) and capture inserted ids count.
  - Write `{ count, timestamp }` to AsyncStorage when count > 0; clear when 0.
  - Return `BackgroundFetch.Result.NewData` when count > 0, else `NoData`/`Failed` as appropriate.
- Foreground toast:
  - On app resume/start (e.g., in a `useEffect` in root layout), read and clear `background-new-articles-v1`.
  - If count > 0, show a toast/snackbar `"${count} new articles"` (use existing toast utility).
- Error handling: catch and log errors to console/Sentry; ensure the task returns `Failed` on exceptions.

## Data

- AsyncStorage key `background-new-articles-v1`: `{ count: number; timestamp: number }`.
- No schema changes; relies on existing article upsert DB/store.

## Testing

- Unit: task handler returns correct `BackgroundFetch.Result` based on count; writes/clears marker.
- Unit: foreground hook shows toast once and clears the marker.
- Integration (manual/device): toggle background fetch permission states; verify periodic refresh and toast after reopening.

## Risks / mitigations

- OS throttling: background fetch timing is best-effort; keep manual pull-to-refresh as fallback.
- Concurrency: guard with a refresh lock to avoid overlapping DB writes.
- Battery/network: keep fetch timeout/budget small; reuse existing timeouts.
