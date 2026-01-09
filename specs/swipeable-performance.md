# Swipeable performance audit (v1.1.0)

## Action plan

- Profile scroll and swipe performance with the current `FeedItem` Swipeable list.
- Optimize FlatList and FeedItem rendering hot paths.
- Evaluate lighter alternatives if Swipeable remains a bottleneck.

## Goals

- Maintain smooth 60fps scrolling on mid-range Android devices.
- Keep swipe actions available or replace with an equivalent interaction.

## Requirements

- No functional regressions (swipe to save/mark read still works or is replaced with a clear alternative).
- Avoid increasing memory usage substantially.

## Implementation outline

- Baseline profiling:
  - Use RN performance monitor and Android Studio profiler to capture FPS and JS frame drops.
  - Record list with 200+ items and images.
- List optimizations (`components/ui/FeedList.tsx`):
  - Set `initialNumToRender`, `windowSize`, `maxToRenderPerBatch`, `updateCellsBatchingPeriod`, `removeClippedSubviews`.
  - Use `getItemLayout` if item height is stable enough.
- Component optimizations (`components/ui/FeedItem.tsx`):
  - Wrap with `React.memo` and memoize derived values.
  - Avoid re-creating swipe action renderers on every render.
  - Precompute `relativeTime` if possible.
- Swipeable alternatives if needed:
  - Replace with `Swipeable` from non-reanimated gesture handler.
- Use long-press menu or inline action buttons for save/read.
  - Render swipe actions only for the active row to reduce overhead.

## Testing

- Manual: scroll performance before/after; verify swipe actions and share button.
- Automated: render list with many items and ensure no crashes.

## Risks / mitigations

- Over-optimizing may reduce UX: keep swipe gestures if performance is acceptable after tuning.
- `removeClippedSubviews` can cause rendering glitches with shadows; verify on Android.
