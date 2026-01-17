export const SWIPE_ACTION_MAX_WIDTH = 480
export const SWIPE_ACTION_TRIGGER_THRESHOLD = 150
export const SWIPE_ACTION_ICON_SIZE = 24
export const SWIPE_ACTION_ICON_MIN_MARGIN_RIGHT = 20

export const getSwipeIconTranslateX = (actionWidth: number, isLeft: boolean) => {
  'worklet'
  if (isLeft) {
    return 0
  }
  const marginRight = (actionWidth - SWIPE_ACTION_ICON_SIZE) / 2
  if (marginRight < SWIPE_ACTION_ICON_MIN_MARGIN_RIGHT) {
    return marginRight - SWIPE_ACTION_ICON_MIN_MARGIN_RIGHT
  }
  return 0
}
