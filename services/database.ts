// SQLite setup, migrations, and serialized writes for the app database.
import * as SQLite from 'expo-sqlite'

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null
// Serialize writes to avoid overlapping transactions on a single connection.
let writeQueue: Promise<void> = Promise.resolve()

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

const createTables = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT,
      url TEXT,
      description TEXT,
      image TEXT,
      lastUpdated TEXT,
      createdAt INTEGER DEFAULT (strftime('%s','now'))
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
  `)

  await ensureColumn(db, 'feeds', 'lastPublishedAt', 'TEXT')
  await ensureColumn(db, 'feeds', 'lastPublishedTs', 'INTEGER')
  await db.execAsync(`
    INSERT INTO article_statuses (articleId, starred, updatedAt)
    SELECT id, 1, strftime('%s','now')
    FROM articles
    WHERE saved = 1
      AND id NOT IN (SELECT articleId FROM article_statuses);
  `)
}

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('pollen.db').then(async (db) => {
      await createTables(db)
      return db
    })
  }
  return dbPromise
}

export const runWrite = async <T>(task: (db: SQLite.SQLiteDatabase) => Promise<T>) => {
  const db = await getDb()
  const previous = writeQueue
  let release!: () => void
  writeQueue = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await task(db)
  } finally {
    release()
  }
}
