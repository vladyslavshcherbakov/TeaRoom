import type { FloorPoint } from '../RoomLayout.ts'

export type Walk = {
  readonly position: FloorPoint
  readonly headingRadians: number
  readonly waypoints: readonly FloorPoint[]
}

const walkingSpeedMetresPerSecond = 1.6

export function standingAt(position: FloorPoint, headingRadians = 0): Walk {
  return { position, headingRadians, waypoints: [] }
}

export function isWalking(walk: Walk): boolean {
  return walk.waypoints.length > 0
}

export function walkFurther(walk: Walk, seconds: number): Walk {
  let position = walk.position
  let headingRadians = walk.headingRadians
  let distanceLeft = walkingSpeedMetresPerSecond * seconds
  const waypoints = [...walk.waypoints]
  while (distanceLeft > 0 && waypoints.length > 0) {
    const next = waypoints[0]
    if (next === undefined) break
    const gap = Math.hypot(next.x - position.x, next.z - position.z)
    if (gap > 0) headingRadians = Math.atan2(next.x - position.x, next.z - position.z)
    if (gap <= distanceLeft) {
      position = next
      distanceLeft -= gap
      waypoints.shift()
      continue
    }
    position = { x: position.x + ((next.x - position.x) * distanceLeft) / gap, z: position.z + ((next.z - position.z) * distanceLeft) / gap }
    distanceLeft = 0
  }
  return { position, headingRadians, waypoints }
}
