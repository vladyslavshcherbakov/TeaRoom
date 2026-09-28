import { clampedToShare } from '../../Shared/Engine/ClampedToShare.ts'

type PointOnTheFloor = {
  readonly x: number
  readonly z: number
}

type PointOnTheScreen = {
  readonly x: number
  readonly y: number
}

export function floorDistanceBetween(first: PointOnTheFloor, second: PointOnTheFloor): number {
  return Math.hypot(first.x - second.x, first.z - second.z)
}

export function screenDistanceBetween(first: PointOnTheScreen, second: PointOnTheScreen): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

export function clamped(value: number, lowest: number, highest: number): number {
  return Math.min(highest, Math.max(lowest, value))
}

export function easedAtBothEnds(share: number): number {
  const clampedShare = clampedToShare(share)
  return clampedShare * clampedShare * (3 - 2 * clampedShare)
}
