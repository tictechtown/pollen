# Full Text Search (SQLite FTS5)

Add an on-device article search experience powered by SQLite FTS, integrated into the existing `reader-api` strategy layer.

## Goals

- Fast, offline-capable search across articles.
- High relevance ranking (title matches > body matches).
- Small, composable API that works for `local` now and can extend to other strategies later.

## Requirements

### UX

- From the Feed tab, a search icon in the header opens a dedicated Search screen.
- Search input is focused on entry; keyboard opens immediately.
- Search scope defaults to the currently selected feed (current filter), and the UI clearly shows the active scope under the input (e.g. “Searching in All articles” / “Searching in <Feed name>” / “Searching in <Folder name>”).
- As the user types, results update using a debounced query (target: ~150–250ms).
- Results are paginated (50 per page) and ordered by relevance.
- Search matches `title` and `content` (treated as text; HTML should not pollute ranking).

### Data

- All indexing and querying happens locally in SQLite for the `local` account.
- Search should work without network connectivity (searches the locally cached DB only).

## Scope

### In scope (v1)

- SQLite FTS-backed search for articles.
- A dedicated Search screen with a results list and pagination.
- Integration point: `ReaderStrategy.articles.searchPage(...)`.

### Out of scope (v1)

- Searching feeds/folders/settings.
- Cross-account global search UI.
- Advanced query operators UI (quoted phrases, `NEAR`, field-specific queries).
- Remote/server search for FreshRSS (can be added later).

## Data model

### Normalize `content` for search

Today, `articles.content` may contain HTML. FTS should index text, not markup. Add a derived column:

- `articles.contentText TEXT` — best-effort plain text extracted from `articles.content`.

Implementation detail: compute `contentText` in JS on insert/update (strip HTML tags + decode entities) rather than trying to do it in SQLite.

### FTS virtual table

Create an FTS5 table indexing `title` and `contentText`:

- `articles_fts(title, contentText, content='articles', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2', prefix='2 3 4')`

Use external-content mode to avoid duplicating full content, and keep the index synced via triggers.

### Triggers (sync)

- After insert/update/delete on `articles`, update `articles_fts` using the standard FTS5 `delete` + reinsert pattern.
- Use `COALESCE(…, '')` so nulls don’t break indexing.

### Migration/versioning

- Bump `PRAGMA user_version`.
- On upgrade:
  - Add `contentText` column if missing.
  - Create `articles_fts` and triggers if missing.
  - Backfill `contentText` for existing rows (JS-side batch job) and run `INSERT INTO articles_fts(articles_fts) VALUES('rebuild');` once.

## API changes

Extend `ReaderArticlesApi` with search:

```ts
type ReaderArticlesSearchPageParams = {
  query: string
  feedId?: string
  page: number
  pageSize: number // capped to 50
}

type ReaderArticlesSearchPageResult = {
  articles: Article[]
  total: number
}
```

- `ReaderStrategy.articles.searchPage(params)`:
  - `local`: uses SQLite FTS.
  - other strategies:
    - v1: either not implemented (throw/return empty) or search local cache only.

## Query semantics

### Input normalization

- `query = query.trim()`
- Collapse consecutive whitespace to a single space.
- Enforce a max length (e.g. 256 chars) to avoid pathological queries.

### Prefix search for “type-ahead”

For incremental typing, convert tokens into prefix queries:

- User input: `open ai`
- FTS query: `open* ai*`

This trades a small relevance cost for much better UX while typing.

### Ranking

Order by a weighted BM25 score, title weighted higher than body:

- `rank = bm25(articles_fts, 5.0, 1.0)`
- `ORDER BY rank ASC, articles.sortTimestamp DESC`

## SQL shape

Suggested SQL (conceptual):

- Count:
  - `SELECT COUNT(*) FROM articles_fts WHERE articles_fts MATCH ?`
- Page:
  - `SELECT articles.*, article_statuses.read, article_statuses.starred`
  - `FROM articles`
  - `JOIN articles_fts ON articles_fts.rowid = articles.rowid`
  - `LEFT JOIN article_statuses …`
  - `WHERE articles_fts MATCH ?`
  - (optional) `AND articles.feedId = ?` if searching within a selected feed
  - `ORDER BY bm25(articles_fts, 5.0, 1.0), articles.sortTimestamp DESC`
  - `LIMIT ? OFFSET ?`

## UI design notes (React Native Paper)

- Header action: search icon on Feed tab header.
- Search screen:
  - `Appbar.Header` with back button.
  - `Searchbar` with `autoFocus`.
  - A small scope label under the search input (inherits current filter by default): “Searching in All articles” / “Searching in <Feed name>” / “Searching in <Folder name>”.
  - Results: `FlatList` reusing existing article list row component(s) where possible.
  - Empty states:
    - No query: show “Search articles” hint.
    - No results: show “No matches” with optional tips (“Try fewer words”).

## Implementation plan (tasks)

1. DB:
   - Add `contentText` column and backfill job.
   - Add `articles_fts` + triggers + rebuild step.
2. Services:
   - Add `searchArticlesPageFromDb(...)` in `services/articles-db.ts`.
   - Add a small query builder for safe prefix queries.
3. Reader API:
   - Extend `ReaderArticlesApi` + implement `searchPage` for `local` strategy.
4. UI:
   - Add Search screen route.
   - Add search icon entry point on the Feed tab header.
   - Implement paginated results and loading states.
5. Tests:
   - Unit test query normalization (prefix building, escaping).
   - DB-layer tests for SQL parameters/order (mocking `expo-sqlite` like existing DB tests).

## Risks / edge cases

- **FTS5 availability:** if a platform build lacks FTS5, table creation will fail; plan a fallback (LIKE search) or a clear error state.
- **HTML-heavy content:** without `contentText` normalization, search quality degrades.
- **Indexing cost:** rebuild/backfill can be expensive; run once and consider chunking during hydration.
- **Pagination with deep offsets:** acceptable for v1; consider cursor-based pagination if needed.

## Open questions

- Should search default to “current feed only” or “all feeds” (and inherit the current filter)?
  - Answer: default to the current feed filter; show a scope label under the input (“Searching in …”). If no feed is selected, it becomes “All articles”.
- Should search include `description` alongside `content` for better coverage?
  - Answer: no, only `content` (plus `title`).
- Do we want to show highlighted snippets (requires lightweight markup parsing in RN)?
  - Answer: no.
