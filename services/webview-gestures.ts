const DEFAULT_EDGE_GESTURE_WIDTH = 24

export const buildEdgeGestureBlockerScript = (edgeWidth = DEFAULT_EDGE_GESTURE_WIDTH): string => {
  const sanitizedWidth = Math.max(0, Math.floor(edgeWidth))
  return `
    (function () {
      var edgeWidth = ${sanitizedWidth};
      function shouldBlockTouch(touch) {
        var x = touch.clientX;
        var width = window.innerWidth || document.documentElement.clientWidth || 0;
        return x <= edgeWidth || x >= width - edgeWidth;
      }
      function maybeBlock(event) {
        if (!event.touches || event.touches.length === 0) return;
        if (!shouldBlockTouch(event.touches[0])) return;
        event.preventDefault();
      }
      document.addEventListener('touchstart', maybeBlock, { passive: false });
      document.addEventListener('touchmove', maybeBlock, { passive: false });
    })();
    true;
  `
}
