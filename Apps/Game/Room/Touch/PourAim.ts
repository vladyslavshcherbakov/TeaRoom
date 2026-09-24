import type { Box, ScenePoint } from '../RoomLayout.ts'

const hoverGapAboveTargetPx = 36
const hoverZoneHeightPx = 150
const pressDepthForSteepestTiltPx = 120
const steepestTiltDegrees = 60
const fullyOnTargetWithinShareOfWidth = 0.25
const missesTargetBeyondShareOfWidth = 0.75

export function hoverLineAbove(target: Box): number {
  return target.y - target.height / 2 - hoverGapAboveTargetPx
}

export function isInPourZone(target: Box, point: ScenePoint): boolean {
  const hoverLineY = hoverLineAbove(target)
  const isAboveTarget = Math.abs(point.x - target.x) <= target.width
  return isAboveTarget && point.y >= hoverLineY - hoverZoneHeightPx && point.y <= target.y + target.height / 2
}

export function tiltForPress(fingerY: number, target: Box): number {
  const pressDepth = Math.max(0, fingerY - hoverLineAbove(target))
  return Math.min(steepestTiltDegrees, (pressDepth / pressDepthForSteepestTiltPx) * steepestTiltDegrees)
}

export function streamOnTargetFraction(spoutX: number, target: Box): number {
  const offset = Math.abs(spoutX - target.x)
  const fullyOnTarget = target.width * fullyOnTargetWithinShareOfWidth
  const missing = target.width * missesTargetBeyondShareOfWidth
  if (offset <= fullyOnTarget) return 1
  if (offset >= missing) return 0
  return (missing - offset) / (missing - fullyOnTarget)
}
