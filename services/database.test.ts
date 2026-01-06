// Tests for database connection helpers.
import { describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => {
  const execAsync = vi.fn().mockResolvedValue(undefined)
  const getAllAsync = vi.fn().mockResolvedValue([])
  const getFirstAsync = vi.fn().mockResolvedValue({ user_version: 1 })
  return { db: { execAsync, getAllAsync, getFirstAsync } }
})

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn().mockResolvedValue(db),
}))

// eslint-disable-next-line import/first
import * as SQLite from 'expo-sqlite'
// eslint-disable-next-line import/first
import { getDb, runWrite } from './database'

describe('getDb', () => {
  it('memoizes the database connection', async () => {
    const first = await getDb()
    const second = await getDb()

    expect(first).toBe(db)
    expect(second).toBe(db)
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1)
  })
})

describe('runWrite', () => {
  it('runs the task with the database', async () => {
    const task = vi.fn().mockResolvedValue('ok')

    const result = await runWrite(task)

    expect(result).toBe('ok')
    expect(task).toHaveBeenCalledWith(db)
  })
})
