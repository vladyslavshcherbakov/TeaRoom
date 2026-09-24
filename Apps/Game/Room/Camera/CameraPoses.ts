import type { CameraPose, CloseUp, FloorPoint, WorldPoint } from '../RoomLayout.ts'

export const cameraFieldOfViewDegrees = 30

const overviewDirection = normalised({ x: 1, y: 1.15, z: 1 })
const overviewWidthMetres = 6.4
const overviewHeightMetres = 7
const roomCentre: WorldPoint = { x: 0, y: 0.4, z: -0.3 }
const followShareOfWalker = 0.6
const settleSeconds = 0.35

export function overviewPose(walker: FloorPoint, aspect: number): CameraPose {
  const target = {
    x: roomCentre.x + (walker.x - roomCentre.x) * followShareOfWalker,
    y: roomCentre.y,
    z: roomCentre.z + (walker.z - roomCentre.z) * followShareOfWalker,
  }
  return poseLookingAt(target, overviewDirection, distanceToFit(overviewWidthMetres, overviewHeightMetres, aspect))
}

export function closeUpPose(closeUp: CloseUp, aspect: number): CameraPose {
  const distance = distanceToFit(closeUp.widthMetres, closeUp.heightMetres, aspect)
  return poseLookingAt(closeUp.target, normalised(closeUp.directionToCamera), distance)
}

export function visibleWidthMetres(distance: number, aspect: number): number {
  return 2 * distance * halfHeightTangent() * aspect
}

export function poseEasedTowards(current: CameraPose, goal: CameraPose, seconds: number): CameraPose {
  const share = 1 - Math.exp(-seconds / settleSeconds)
  return { position: pointBetween(current.position, goal.position, share), target: pointBetween(current.target, goal.target, share) }
}

function poseLookingAt(target: WorldPoint, direction: WorldPoint, distance: number): CameraPose {
  return {
    position: { x: target.x + direction.x * distance, y: target.y + direction.y * distance, z: target.z + direction.z * distance },
    target,
  }
}

function distanceToFit(widthMetres: number, heightMetres: number, aspect: number): number {
  const distanceForHeight = heightMetres / 2 / halfHeightTangent()
  const distanceForWidth = widthMetres / 2 / (halfHeightTangent() * aspect)
  return Math.max(distanceForHeight, distanceForWidth)
}

function halfHeightTangent(): number {
  return Math.tan(((cameraFieldOfViewDegrees / 2) * Math.PI) / 180)
}

function pointBetween(from: WorldPoint, to: WorldPoint, share: number): WorldPoint {
  return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share, z: from.z + (to.z - from.z) * share }
}

function normalised(point: WorldPoint): WorldPoint {
  const length = Math.hypot(point.x, point.y, point.z)
  return { x: point.x / length, y: point.y / length, z: point.z / length }
}
