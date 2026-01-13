import { describe, expect, it } from 'vitest'

import {
  getSwipeIconTranslateX,
  SWIPE_ACTION_ICON_MIN_MARGIN_RIGHT,
  SWIPE_ACTION_ICON_SIZE,
} from './swipeActionUtils'

describe('getSwipeIconTranslateX', () => {
  it('returns zero for left actions', () => {
    expect(getSwipeIconTranslateX(60, true)).toBe(0)
  })

  it('returns zero when the right margin meets the minimum', () => {
    const actionWidth = SWIPE_ACTION_ICON_SIZE + SWIPE_ACTION_ICON_MIN_MARGIN_RIGHT * 2
    expect(getSwipeIconTranslateX(actionWidth, false)).toBe(0)
  })

  it('shifts left when the right margin is too small', () => {
    const actionWidth = 60
    const marginRight = (actionWidth - SWIPE_ACTION_ICON_SIZE) / 2
    const expected = marginRight - SWIPE_ACTION_ICON_MIN_MARGIN_RIGHT
    expect(getSwipeIconTranslateX(actionWidth, false)).toBe(expected)
  })
})
