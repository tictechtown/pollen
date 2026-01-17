export type ListPerformanceProps = Readonly<{
  initialNumToRender: number
  maxToRenderPerBatch: number
  windowSize: number
  updateCellsBatchingPeriod: number
  removeClippedSubviews: boolean
}>

const SMALL_LIST_LIMIT = 20
const MEDIUM_LIST_LIMIT = 100
const LIST_BATCHING_PERIOD_MS = 50

export const LIST_PERFORMANCE_PRESETS = {
  small: {
    initialNumToRender: 6,
    maxToRenderPerBatch: 6,
    windowSize: 5,
    updateCellsBatchingPeriod: LIST_BATCHING_PERIOD_MS,
    removeClippedSubviews: true,
  },
  medium: {
    initialNumToRender: 8,
    maxToRenderPerBatch: 8,
    windowSize: 7,
    updateCellsBatchingPeriod: LIST_BATCHING_PERIOD_MS,
    removeClippedSubviews: true,
  },
  large: {
    initialNumToRender: 20,
    maxToRenderPerBatch: 20,
    windowSize: 9,
    updateCellsBatchingPeriod: LIST_BATCHING_PERIOD_MS,
    removeClippedSubviews: true,
  },
} as const satisfies Record<'small' | 'medium' | 'large', ListPerformanceProps>

export function getListPerformanceProps(itemCount: number): ListPerformanceProps {
  const count = Number.isFinite(itemCount) ? Math.max(0, itemCount) : 0
  if (count <= SMALL_LIST_LIMIT) {
    return LIST_PERFORMANCE_PRESETS.small
  }
  if (count <= MEDIUM_LIST_LIMIT) {
    return LIST_PERFORMANCE_PRESETS.medium
  }
  return LIST_PERFORMANCE_PRESETS.large
}
