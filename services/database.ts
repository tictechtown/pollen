// SQLite setup, migrations, and serialized writes for the app database.
import * as SQLite from 'expo-sqlite'

import { toPlainTextFromHtml } from './fts'

const DEFAULT_DB_KEY = '__default__'
const DEFAULT_DB_FILE = 'pollen-6.db'

type DbKey = string | undefined

const keyForMap = (key?: DbKey) => key ?? DEFAULT_DB_KEY

const dbFileForKey = (key?: DbKey) => {
  if (!key) return DEFAULT_DB_FILE
  // Keep filenames safe and short; callers should supply a stable namespace key.
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 64)
  return `pollen-${safe}.db`
}

const dbPromises = new Map<string, Promise<SQLite.SQLiteDatabase>>()
// Serialize writes to avoid overlapping transactions on a single connection.
const writeQueues = new Map<string, Promise<void>>()

const LATEST_USER_VERSION = 2

const ensureColumn = async (
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) => {
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)
  const hasColumn = info.some((col) => col.name === column)
  if (!hasColumn) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`)
  }
}

const getUserVersion = async (db: SQLite.SQLiteDatabase): Promise<number> => {
  const row = await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version;`)
  return Number(row?.user_version) || 0
}

const setUserVersion = async (db: SQLite.SQLiteDatabase, version: number) => {
  await db.execAsync(`PRAGMA user_version = ${Math.max(0, Math.floor(version))};`)
}

const ensureUniqueFeedXmlUrl = async (db: SQLite.SQLiteDatabase) => {
  const createIndex = async () => {
    await db.execAsync(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_feeds_xmlUrl_unique ON feeds(xmlUrl);`,
    )
  }

  try {
    await createIndex()
    return
  } catch {
    // Likely duplicates in existing DB; de-dupe then retry.
  }

  await createIndex()
}

const ensureArticleFts = async (db: SQLite.SQLiteDatabase) => {
  try {
    await db.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
        title,
        contentText,
        content='articles',
        content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2',
        prefix='2 3 4'
      );

      CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
        INSERT INTO articles_fts(rowid, title, contentText)
        VALUES (new.rowid, COALESCE(new.title, ''), COALESCE(new.contentText, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
        INSERT INTO articles_fts(articles_fts, rowid, title, contentText)
        VALUES ('delete', old.rowid, COALESCE(old.title, ''), COALESCE(old.contentText, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
        INSERT INTO articles_fts(articles_fts, rowid, title, contentText)
        VALUES ('delete', old.rowid, COALESCE(old.title, ''), COALESCE(old.contentText, ''));
        INSERT INTO articles_fts(rowid, title, contentText)
        VALUES (new.rowid, COALESCE(new.title, ''), COALESCE(new.contentText, ''));
      END;
    `)
  } catch (err) {
    console.warn('SQLite FTS unavailable; search may be degraded', err)
  }
}

const backfillArticleContentText = async (db: SQLite.SQLiteDatabase) => {
  while (true) {
    const rows = await db.getAllAsync<{ rowid: number; content: string | null }>(`
      SELECT rowid, content
      FROM articles
      WHERE (contentText IS NULL OR contentText = '')
        AND content IS NOT NULL
        AND content != ''
      LIMIT 200
    `)

    if (!rows.length) return

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        const text = toPlainTextFromHtml(row.content)
        await db.runAsync(`UPDATE articles SET contentText = ? WHERE rowid = ?`, [text, row.rowid])
      }
    })
  }
}

const rebuildArticleFts = async (db: SQLite.SQLiteDatabase) => {
  try {
    await db.execAsync(`INSERT INTO articles_fts(articles_fts) VALUES('rebuild');`)
  } catch (err) {
    console.warn('SQLite FTS rebuild failed; search may be degraded', err)
  }
}

const createTables = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS feed_folders (
      id TEXT PRIMARY KEY,
      title TEXT,
      createdAt INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT,
      xmlUrl TEXT UNIQUE,
      htmlUrl TEXT,
      description TEXT,
      image TEXT,
      folderId TEXT,
      lastUpdated TEXT,
      expiresTS INTEGER,
      expires TEXT,
      ETag TEXT,
      lastModified TEXT,
      createdAt INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY(folderId) REFERENCES feed_folders(id)
    );
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      feedId TEXT,
      title TEXT,
      link TEXT,
      source TEXT,
      publishedAt TEXT,
      updatedAt TEXT,
      description TEXT,
      content TEXT,
      contentText TEXT,
      thumbnail TEXT,
      saved INTEGER DEFAULT 0,
      sortTimestamp INTEGER DEFAULT 0,
      createdAt INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY(feedId) REFERENCES feeds(id)
    );
    CREATE TABLE IF NOT EXISTS article_statuses (
      articleId TEXT PRIMARY KEY,
      read INTEGER DEFAULT 0,
      starred INTEGER DEFAULT 0,
      lastReadAt INTEGER,
      updatedAt INTEGER,
      FOREIGN KEY(articleId) REFERENCES articles(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_articles_feed ON articles(feedId);
    CREATE INDEX IF NOT EXISTS idx_articles_sort ON articles(sortTimestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_article_statuses_read ON article_statuses(read);
    CREATE INDEX IF NOT EXISTS idx_article_statuses_starred ON article_statuses(starred);
    CREATE INDEX IF NOT EXISTS idx_feeds_folder ON feeds(folderId);
  `)

  await ensureUniqueFeedXmlUrl(db)
  await ensureColumn(db, 'feeds', 'lastPublishedTs', 'INTEGER')
  await ensureColumn(db, 'feeds', 'expiresTS', 'INTEGER')
  await ensureColumn(db, 'feeds', 'expires', 'TEXT')
  await ensureColumn(db, 'feeds', 'ETag', 'TEXT')
  await ensureColumn(db, 'feeds', 'lastModified', 'TEXT')
  await ensureColumn(db, 'feeds', 'folderId', 'TEXT')
  await ensureColumn(db, 'articles', 'contentText', 'TEXT')
  await ensureArticleFts(db)

  const initialVersion = await getUserVersion(db)
  let version = initialVersion

  if (version < 1) {
    await db.execAsync(`
      INSERT INTO article_statuses (articleId, starred, updatedAt)
      SELECT id, 1, strftime('%s','now')
      FROM articles
      WHERE saved = 1
        AND id NOT IN (SELECT articleId FROM article_statuses);
    `)
    version = 1
  }

  if (version < 2) {
    await backfillArticleContentText(db)
    await rebuildArticleFts(db)
    version = 2
  }

  if (version !== initialVersion && version <= LATEST_USER_VERSION) {
    await setUserVersion(db, version)
  }
}

export const getDb = (key?: DbKey) => {
  const mapKey = keyForMap(key)
  const existing = dbPromises.get(mapKey)
  if (existing) return existing

  const promise = SQLite.openDatabaseAsync(dbFileForKey(key)).then(async (db) => {
    await createTables(db)
    return db
  })
  dbPromises.set(mapKey, promise)
  return promise
}

export const runWrite = async <T>(task: (db: SQLite.SQLiteDatabase) => Promise<T>, key?: DbKey) => {
  const db = await getDb(key)
  const mapKey = keyForMap(key)
  const previous = writeQueues.get(mapKey) ?? Promise.resolve()
  let release!: () => void
  const next = new Promise<void>((resolve) => {
    release = resolve
  })
  writeQueues.set(mapKey, next)
  await previous
  try {
    return await task(db)
  } finally {
    release()
  }
}
