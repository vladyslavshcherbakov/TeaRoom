import type { ScreenPoint } from './ScreenPoint.ts'

export const smallestTouchAreaPixels = 44

export type ScreenBox = {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

export type TouchableOnScreen<Target> = {
  readonly target: Target
  readonly box: ScreenBox
  readonly isDrawnOverTheScene: boolean
  readonly nearestDistance: number
  readonly distanceSeenAtItsMiddle: number | null
}

export function touchAreaAround(box: ScreenBox): ScreenBox {
  const middle = middleOf(box)
  const halfWidth = Math.max(box.right - box.left, smallestTouchAreaPixels) / 2
  const halfHeight = Math.max(box.bottom - box.top, smallestTouchAreaPixels) / 2
  return { left: middle.x - halfWidth, top: middle.y - halfHeight, right: middle.x + halfWidth, bottom: middle.y + halfHeight }
}

export function fingertipAround(finger: ScreenPoint): ScreenBox {
  return touchAreaAround({ left: finger.x, top: finger.y, right: finger.x, bottom: finger.y })
}

export function middleOf(box: ScreenBox): ScreenPoint {
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
}

export function isInTheTouchAreaOf(finger: ScreenPoint, box: ScreenBox): boolean {
  const area = touchAreaAround(box)
  return finger.x >= area.left && finger.x <= area.right && finger.y >= area.top && finger.y <= area.bottom
}

export function isHiddenBehindSomethingNearer(touchable: TouchableOnScreen<unknown>): boolean {
  return touchable.distanceSeenAtItsMiddle !== null && touchable.distanceSeenAtItsMiddle < touchable.nearestDistance
}

export function touchablesReachedAt<Target>(finger: ScreenPoint, touchables: readonly TouchableOnScreen<Target>[]): TouchableOnScreen<Target>[] {
  return touchables
    .filter((touchable) => isInTheTouchAreaOf(finger, touchable.box) && !isHiddenBehindSomethingNearer(touchable))
    .sort((first, second) => Number(second.isDrawnOverTheScene) - Number(first.isDrawnOverTheScene) || pixelsBetween(finger, first.box) - pixelsBetween(finger, second.box) || first.nearestDistance - second.nearestDistance)
}

function pixelsBetween(finger: ScreenPoint, box: ScreenBox): number {
  const across = Math.max(box.left - finger.x, 0, finger.x - box.right)
  const down = Math.max(box.top - finger.y, 0, finger.y - box.bottom)
  return Math.hypot(across, down)
}
