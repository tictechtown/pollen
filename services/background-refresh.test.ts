// Tests for background refresh task wiring.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { storage, backgroundFetch, taskManager, refreshStore } = vi.hoisted(() => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  backgroundFetch: {
    getStatusAsync: vi.fn(),
    registerTaskAsync: vi.fn(),
    BackgroundFetchStatus: { Available: 1 },
    BackgroundFetchResult: { NewData: 1, NoData: 2, Failed: 3 },
  },
  taskManager: {
    defineTask: vi.fn(),
    getRegisteredTasksAsync: vi.fn(),
  },
  refreshStore: {
    refresh: vi.fn(),
  },
}))

vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }))
vi.mock('expo-background-fetch', () => backgroundFetch)
vi.mock('expo-task-manager', () => taskManager)
vi.mock('@/store/refresh', () => ({
  useRefreshStore: {
    getState: () => ({ refresh: refreshStore.refresh }),
  },
}))

// eslint-disable-next-line import/first
import { consumeBackgroundMarker, registerBackgroundRefresh } from './background-refresh'

describe('consumeBackgroundMarker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads and clears the stored marker', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ count: 2, timestamp: 100 }))

    const result = await consumeBackgroundMarker()

    expect(result).toEqual({ count: 2, timestamp: 100 })
    expect(storage.removeItem).toHaveBeenCalledWith('background-new-articles-v1')
  })
})

describe('registerBackgroundRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers the background task when available', async () => {
    backgroundFetch.getStatusAsync.mockResolvedValue(
      backgroundFetch.BackgroundFetchStatus.Available,
    )
    taskManager.getRegisteredTasksAsync.mockResolvedValue([])

    await registerBackgroundRefresh()

    expect(backgroundFetch.registerTaskAsync).toHaveBeenCalledWith('background-refresh-task', {
      minimumInterval: 30 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    })
  })
})
