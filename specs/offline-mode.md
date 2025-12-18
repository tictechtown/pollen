# Offline mode plan (SQLite + decoupled seen list)

## Goals (vNext)
- Persist all feeds/articles offline in SQLite (no truncation).
- Filter by `feedId` and sort articles by published/updated timestamp desc.
- Track seen/unseen via a lightweight JSON list of article ids (separate from DB) that survives app restarts and feed refreshes.
- Keep refresh-by-feed behavior (single feed refresh when selected).

## Current state
- Articles/feeds stored in zustand with AsyncStorage persistence (`store/articles.ts`, `store/feeds.ts`); content is truncated and metadata merges by id.
- Filtering lives in `store/filters.ts` (feedId, unseen-only).
- Refresh pulls XML via `fetchFeed`, builds `Article` objects with `feedId`, and replaces in-memory list.
- Seen/saved flags live on the Article object; not decoupled.

## Design options
- **Raw `expo-sqlite` tables (recommended)**: Direct SQL schema; easy to control sorting/filtering and incremental upserts. Minimal deps.
- WatermelonDB/Realm: Higher-level querying, but heavier setup and native installs; likely overkill here.

## Proposed architecture
- Use `expo-sqlite` (or `expo-sqlite/next`) for a local DB.
- Keep zustand as an in-memory cache backed by DB reads; on app start or refresh, hydrate from DB.
- Keep network fetch → parse → normalize → upsert into DB; query DB for UI.
- Maintain `seenIds` as a separate persisted JSON list in AsyncStorage (e.g., `seen-articles-v1`), not in the DB row.

## Data model (SQLite)
- `feeds (id TEXT PRIMARY KEY, title TEXT, url TEXT, description TEXT, image TEXT, lastUpdated TEXT, createdAt INTEGER DEFAULT (strftime('%s','now')))`
- `articles (id TEXT PRIMARY KEY, feedId TEXT, title TEXT, link TEXT, source TEXT, publishedAt TEXT, updatedAt TEXT, description TEXT, content TEXT, thumbnail TEXT, saved INTEGER DEFAULT 0, createdAt INTEGER DEFAULT (strftime('%s','now')), FOREIGN KEY(feedId) REFERENCES feeds(id))`
  - No truncation of `content`/`description`.
  - Index on `feedId`, and on `(publishedAt DESC, updatedAt DESC)` for sorting.

## Querying for UI
- Base query: `SELECT * FROM articles ORDER BY COALESCE(updatedAt, publishedAt) DESC`.
- Filter by feed: add `WHERE feedId = ?`.
- Apply seen filter in JS by checking `seenIds` list and dropping seen when unseen-only is active (or join via a temp table if needed later).
- Saved filter (future) can use `saved = 1`.

## Refresh/upsert flow
1. Determine target feeds (selected-only vs all) as today.
2. Fetch/parse feeds → normalized Articles with `feedId`.
3. Upsert feeds and articles:
   - Feeds: `INSERT OR REPLACE` on `id`.
   - Articles: `INSERT OR REPLACE` on `id` to keep content intact; do not overwrite `saved` flag if already stored—preserve it by reading existing rows or using a partial update strategy.
4. After upserts, read from DB into zustand (articles + feeds) for rendering.

## Seen tracking
- Store `seenIds` in AsyncStorage (JSON array) keyed by version.
- On article open: add id to `seenIds`. On “mark all seen”: union with current result set ids.
- When rendering unseen-only, filter in JS via `seenIds` (keeps DB schema clean).

## Migration path
- One-time: read existing AsyncStorage articles/feeds, bulk insert into SQLite, and mark saved flags accordingly; clear legacy storage after success.
- Add a version flag in AsyncStorage to skip re-migrating.
- Because content was truncated before, later fetches will hydrate full content.

## Open questions / risks (resolved)
- Size growth: add a “Clear old articles” action in settings to delete rows older than 6 months (`DELETE FROM articles WHERE publishedAt < ? OR updatedAt < ?`). Optionally cap to last N per feed in the same pass.
- Concurrency: keep refresh/upsert serialized (single queue/lock) to avoid SQLite write contention.
- Platform: target only iOS/Android/Expo; no other platform support needed.
