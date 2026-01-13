import { describe, expect, it } from 'vitest'

import { buildEdgeGestureBlockerScript } from './webview-gestures'

describe('buildEdgeGestureBlockerScript', () => {
  it('includes the edge width and listeners for touch events', () => {
    const script = buildEdgeGestureBlockerScript(32)
    expect(script).toContain('var edgeWidth = 32')
    expect(script).toContain('touchstart')
    expect(script).toContain('touchmove')
    expect(script).toContain('passive: false')
    expect(script).toContain('event.preventDefault')
  })

  it('sanitizes negative widths to zero', () => {
    const script = buildEdgeGestureBlockerScript(-12)
    expect(script).toContain('var edgeWidth = 0')
  })
})
