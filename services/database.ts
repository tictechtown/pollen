// SQLite setup, migrations, and serialized writes for the app database.
import * as SQLite from 'expo-sqlite'

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
  await db.execAsync(`
    INSERT INTO article_statuses (articleId, starred, updatedAt)
    SELECT id, 1, strftime('%s','now')
    FROM articles
    WHERE saved = 1
      AND id NOT IN (SELECT articleId FROM article_statuses);
  `)
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
