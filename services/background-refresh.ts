// Background fetch task wiring and marker storage for new articles.
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'

import { refreshFeedsAndArticles } from './refresh'

const TASK_NAME = 'background-refresh-task'
const STORAGE_KEY = 'background-new-articles-v1'

type Marker = { count: number; timestamp: number }

let refreshLock = false

const acquireLock = () => {
  if (refreshLock) return false
  refreshLock = true
  return true
}

const releaseLock = () => {
  refreshLock = false
}

const readMarker = async (): Promise<Marker | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Marker
    if (!parsed?.count) return null
    return parsed
  } catch {
    return null
  }
}

export const consumeBackgroundMarker = async () => {
  const marker = await readMarker()
  await AsyncStorage.removeItem(STORAGE_KEY)
  return marker
}

const setMarker = async (count: number) => {
  if (!count) {
    await AsyncStorage.removeItem(STORAGE_KEY)
    return
  }
  const marker: Marker = { count, timestamp: Date.now() }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(marker))
}

let taskDefined = false

const ensureTaskDefined = () => {
  if (taskDefined) return
  taskDefined = true
  TaskManager.defineTask(TASK_NAME, async () => {
    if (!acquireLock()) {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    try {
      const result = await refreshFeedsAndArticles({})
      if (result.newArticlesCount > 0) {
        await setMarker(result.newArticlesCount)
        return BackgroundFetch.BackgroundFetchResult.NewData
      }
      return BackgroundFetch.BackgroundFetchResult.NoData
    } catch (error) {
      console.error('Background refresh failed', error)
      return BackgroundFetch.BackgroundFetchResult.Failed
    } finally {
      releaseLock()
    }
  })
}

export const registerBackgroundRefresh = async () => {
  ensureTaskDefined()
  const status = await BackgroundFetch.getStatusAsync()
  if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
    console.warn('Background fetch unavailable', status)
    return
  }

  const tasks = await TaskManager.getRegisteredTasksAsync()
  const alreadyRegistered = tasks.some((task) => task.taskName === TASK_NAME)
  if (alreadyRegistered) {
    return
  }

  await BackgroundFetch.registerTaskAsync(TASK_NAME, {
    minimumInterval: 30 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  })
}

ensureTaskDefined()
