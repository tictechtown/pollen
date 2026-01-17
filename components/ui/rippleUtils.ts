type RippleLayout = {
  width: number
  height: number
}

type RippleOrigin = {
  x: number
  y: number
}

export const getRippleDiameter = (layout: RippleLayout, origin: RippleOrigin) => {
  if (layout.width <= 0 || layout.height <= 0) return 0
  const distances = [
    Math.hypot(origin.x, origin.y),
    Math.hypot(layout.width - origin.x, origin.y),
    Math.hypot(origin.x, layout.height - origin.y),
    Math.hypot(layout.width - origin.x, layout.height - origin.y),
  ]
  return Math.max(...distances) * 2
}
