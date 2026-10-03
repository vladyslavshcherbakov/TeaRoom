import type { FloorPoint } from '../Points.ts'
import { floorDistanceBetween } from '../Arithmetic.ts'

export type Walk = {
  readonly position: FloorPoint
  readonly headingRadians: number
  readonly waypoints: readonly FloorPoint[]
}

export const walkingSpeedMetresPerSecond = 1.6
export const turningRadiansPerSecond = 5
export const turnsInPlaceBeyondRadians = Math.PI / 3

export function standingAt(position: FloorPoint, headingRadians = 0): Walk {
  return { position, headingRadians, waypoints: [] }
}

export function isWalking(walk: Walk): boolean {
  return walk.waypoints.length > 0
}

export function walkFurther(walk: Walk, seconds: number): Walk {
  const next = walk.waypoints[0]
  if (next === undefined) return walk
  const headingToTheNext = floorDistanceBetween(next, walk.position) > 0 ? headingFrom(walk.position, next) : walk.headingRadians
  const headingRadians = headingTurnedTowards(walk.headingRadians, headingToTheNext, turningRadiansPerSecond * seconds)
  if (Math.abs(radiansBetween(headingRadians, headingToTheNext)) > turnsInPlaceBeyondRadians) return { ...walk, headingRadians }
  const stepped = steppedAlong(walk, walkingSpeedMetresPerSecond * seconds)
  const nextAfterTheStep = stepped.waypoints[0]
  const headingOfTheStep = nextAfterTheStep === undefined || floorDistanceBetween(nextAfterTheStep, stepped.position) === 0 ? headingToTheNext : headingFrom(stepped.position, nextAfterTheStep)
  return { ...stepped, headingRadians: headingTurnedTowards(walk.headingRadians, headingOfTheStep, turningRadiansPerSecond * seconds) }
}

export function headingTurnedTowards(headingRadians: number, wantedRadians: number, mostRadians: number): number {
  const left = radiansBetween(headingRadians, wantedRadians)
  return Math.abs(left) <= mostRadians ? wantedRadians : headingRadians + Math.sign(left) * mostRadians
}

export function headingFrom(from: FloorPoint, to: FloorPoint): number {
  return Math.atan2(to.x - from.x, to.z - from.z)
}

function steppedAlong(walk: Walk, distance: number): { readonly position: FloorPoint; readonly waypoints: readonly FloorPoint[] } {
  let position = walk.position
  let distanceLeft = distance
  const waypoints = [...walk.waypoints]
  while (distanceLeft > 0 && waypoints.length > 0) {
    const next = waypoints[0]
    if (next === undefined) break
    const gap = floorDistanceBetween(next, position)
    if (gap <= distanceLeft) {
      position = next
      distanceLeft -= gap
      waypoints.shift()
      continue
    }
    position = { x: position.x + ((next.x - position.x) * distanceLeft) / gap, z: position.z + ((next.z - position.z) * distanceLeft) / gap }
    distanceLeft = 0
  }
  return { position, waypoints }
}

function radiansBetween(fromRadians: number, toRadians: number): number {
  return Math.atan2(Math.sin(toRadians - fromRadians), Math.cos(toRadians - fromRadians))
}
