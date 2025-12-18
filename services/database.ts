import * as SQLite from 'expo-sqlite'

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

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
    CREATE INDEX IF NOT EXISTS idx_articles_feed ON articles(feedId);
    CREATE INDEX IF NOT EXISTS idx_articles_sort ON articles(sortTimestamp DESC);
  `)

  await ensureColumn(db, 'feeds', 'lastPublishedAt', 'TEXT')
  await ensureColumn(db, 'feeds', 'lastPublishedTs', 'INTEGER')
}

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('rss-reader.db').then(async (db) => {
      await createTables(db)
      return db
    })
  }
  return dbPromise
}
