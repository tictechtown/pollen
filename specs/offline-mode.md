# Offline mode state (SQLite + decoupled read list)

## Goals

- Persist feeds/articles offline in SQLite (no truncation).
- Filter by `feedId` and sort articles by published/updated timestamp desc.
- Track read/unread and starred state in SQLite via `article_statuses`.
- Keep refresh-by-feed behavior (single feed refresh when selected).

## Current state

- Articles and feeds are persisted in SQLite via `expo-sqlite` (`services/database.ts`).
- Zustand stores (`store/articles.ts`, `store/feeds.ts`) are in-memory caches hydrated from SQLite on boot and after refresh.
- Filtering lives in `store/filters.ts` (selected feed, unread-only) and is applied in `hooks/useArticles.ts`.
- Refresh pulls XML via `fetchFeed`, builds `Article` objects with `feedId`, and upserts into SQLite.
- Read and starred state are stored in SQLite (`article_statuses`).

## Design options

- **Raw `expo-sqlite` tables (implemented)**: Direct SQL schema; easy to control sorting/filtering and incremental upserts. Minimal deps.

## Architecture

- Use `expo-sqlite` for a local DB with a single connection.
- Keep zustand as an in-memory cache backed by DB reads; on app start or refresh, hydrate from DB.
- Keep network fetch → parse → normalize → upsert into DB; query DB for UI.
- Maintain read/starred state in `article_statuses` instead of AsyncStorage.

## Data model (SQLite)

- `feeds`
  - `id` TEXT PRIMARY KEY
  - `title` TEXT
  - `xmlUrl` TEXT
  - `htmlUrl` TEXT
  - `description` TEXT
  - `image` TEXT
  - `lastUpdated` TEXT
  - `lastPublishedAt` TEXT
  - `lastPublishedTs` INTEGER
  - `createdAt` INTEGER DEFAULT (strftime('%s','now'))
- `articles`
  - `id` TEXT PRIMARY KEY
  - `feedId` TEXT (FK → `feeds.id`)
  - `title` TEXT
  - `link` TEXT
  - `source` TEXT
  - `publishedAt` TEXT
  - `updatedAt` TEXT
  - `description` TEXT
  - `content` TEXT
  - `thumbnail` TEXT
  - `saved` INTEGER DEFAULT 0
  - `sortTimestamp` INTEGER DEFAULT 0
  - `createdAt` INTEGER DEFAULT (strftime('%s','now'))
  - Indexes: `idx_articles_feed (feedId)`, `idx_articles_sort (sortTimestamp DESC)`
  - `sortTimestamp` is computed from `updatedAt` or `publishedAt` on upsert.
- `article_statuses`
  - `articleId` TEXT PRIMARY KEY (FK → `articles.id`)
  - `read` BOOLEAN DEFAULT 0
  - `starred` BOOLEAN DEFAULT 0
  - `lastReadAt` INTEGER NULL
  - `updatedAt` INTEGER

## Querying for UI

- Base query: `SELECT * FROM articles ORDER BY sortTimestamp DESC, createdAt DESC`.
- Filter by feed: add `WHERE feedId = ?`.
- Unread filter uses `article_statuses.read = 0` (join when needed).
- Starred (bookmarked) filter uses `article_statuses.starred = 1`.

## Refresh/upsert flow

1. Determine target feeds (selected-only vs all) as today.
2. Fetch/parse feeds → normalized Articles with `feedId`.
3. Upsert feeds and articles:
   - Feeds: `INSERT ... ON CONFLICT(id) DO UPDATE`.
   - Articles: `INSERT ... ON CONFLICT(id) DO UPDATE`, preserving existing `saved` when present.
4. After upserts, read from DB into zustand (articles + feeds) for rendering.

## Read/starred handling

- Stored in SQLite as `article_statuses.read` and `article_statuses.starred`.
- When an article is opened, set `read = 1`, update `lastReadAt`, and bump `updatedAt`.
- "Mark all read" sets `read = 1` and updates timestamps for the current result set.
- Star/unstar toggles `starred` and bumps `updatedAt`.

## Migration path

- Not needed for new installs; legacy AsyncStorage-based articles/feeds are no longer used.

## Open questions / risks

- Size growth: add a “Clear old articles” action in settings to delete rows older than 6 months (`DELETE FROM articles WHERE sortTimestamp < ?`). Optionally cap to last N per feed in the same pass.
- Platform: target only iOS/Android/Expo; no other platform support needed.
