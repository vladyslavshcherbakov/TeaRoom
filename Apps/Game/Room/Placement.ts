import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { carriedItemIdsIn, itemLocationIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { carriedShapeOf, footprintCirclesMetres, footprintRadiusMetres, furniture, heaterFootprintRadiusMetres, openLidRadiusMetres, sinkBasin, type FloorPoint } from './RoomLayout.ts'

const sameShelfBoardWithinMetres = 0.15
const openLidGapMetres = 0.01
const openLidDirectionsRadians = [Math.PI, 0, Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, Math.PI / 4, (-3 * Math.PI) / 4, -Math.PI / 4]

type Circle = { readonly spot: Spot; readonly radius: number; readonly restsOnTheSurface: boolean }

export type PlacementRefusal = 'offTheEdge' | 'somethingIsThere' | 'theHeaterIsThere' | 'theSinkIsThere'

export function whyThereIsNoRoomFor(itemId: string, spot: Spot, state: DeepReadonly<SessionState>, heaterSpot: Spot): PlacementRefusal | null {
  const circles = footprintOf(state, itemId, spot)
  const refusal = whyThereIsNoRoomForCircles(circles, itemId, state, heaterSpot)
  if (refusal !== null) return refusal
  const lidsLying = lidsLyingBesideTheirItems(state, heaterSpot).filter((lid) => lid.itemId !== itemId)
  return lidsLying.some((lid) => circles.some((circle) => isNear(circle.spot, lid.spot, circle.radius + lid.radius))) ? 'somethingIsThere' : null
}

export function openLidOffsetBeside(itemId: string, state: DeepReadonly<SessionState>, heaterSpot: Spot): FloorPoint | null {
  const location = itemLocationIn(state, itemId)
  const shape = carriedShapeOf(state, itemId)
  if (location?.kind !== 'onSurface' || shape === undefined) return null
  const lidRadius = openLidRadiusMetres[shape]
  const distance = footprintRadiusMetres[shape] + lidRadius + openLidGapMetres
  const offsets = openLidDirectionsRadians.map((direction) => ({ x: Math.cos(direction) * distance, z: Math.sin(direction) * distance }))
  return offsets.find((offset) => whyThereIsNoRoomForCircles([{ spot: offsetSpot(location.spot, offset), radius: lidRadius, restsOnTheSurface: true }], null, state, heaterSpot) === null) ?? null
}

function whyThereIsNoRoomForCircles(circles: readonly Circle[], movingItemId: string | null, state: DeepReadonly<SessionState>, heaterSpot: Spot): PlacementRefusal | null {
  for (const { spot, radius } of circles.filter((circle) => circle.restsOnTheSurface)) {
    const piece = furniture.find((candidate) => candidate.id === spot.placeId)
    if (piece === undefined) return 'offTheEdge'
    const { footprint } = piece
    const isInsideTheTop = Math.abs(spot.x - footprint.x) <= footprint.width / 2 - radius && Math.abs(spot.z - footprint.z) <= footprint.depth / 2 - radius
    if (!isInsideTheTop) return 'offTheEdge'
    if (isNear(spot, heaterSpot, radius + heaterFootprintRadiusMetres)) return 'theHeaterIsThere'
    if (spot.placeId === sinkBasin.placeId && overlapsTheSink(spot, radius)) return 'theSinkIsThere'
  }
  const neighbourCircles = itemsOnSurfaces(state).filter((item) => item.itemId !== movingItemId).flatMap((item) => footprintOf(state, item.itemId, item.spot))
  const isTouchingANeighbour = circles.some((circle) => neighbourCircles.some((neighbour) => isNear(circle.spot, neighbour.spot, circle.radius + neighbour.radius)))
  return isTouchingANeighbour ? 'somethingIsThere' : null
}

function footprintOf(state: DeepReadonly<SessionState>, itemId: string, spot: Spot): Circle[] {
  const shape = carriedShapeOf(state, itemId)
  if (shape === undefined) return []
  return footprintCirclesMetres[shape].map((circle) => ({ spot: offsetSpot(spot, circle), radius: circle.radius, restsOnTheSurface: circle.restsOnTheSurface }))
}

function lidsLyingBesideTheirItems(state: DeepReadonly<SessionState>, heaterSpot: Spot): { itemId: string; spot: Spot; radius: number }[] {
  return itemsOnSurfaces(state).flatMap(({ itemId, spot }) => {
    const shape = carriedShapeOf(state, itemId)
    if (shape === undefined || !isLidOpen(state, itemId) || state.sink.itemIdInside === itemId) return []
    const offset = openLidOffsetBeside(itemId, state, heaterSpot)
    return offset === null ? [] : [{ itemId, spot: offsetSpot(spot, offset), radius: openLidRadiusMetres[shape] }]
  })
}

function isLidOpen(state: DeepReadonly<SessionState>, itemId: string): boolean {
  return carriedShapeOf(state, itemId) === 'caddy' ? state.caddy.isOpen : state.vessels[itemId]?.isLidOpen === true
}

function offsetSpot(spot: Spot, offset: FloorPoint): Spot {
  return { ...spot, x: spot.x + offset.x, z: spot.z + offset.z }
}

function overlapsTheSink(spot: Spot, radius: number): boolean {
  return Math.abs(spot.x - sinkBasin.x) < sinkBasin.width / 2 + radius && Math.abs(spot.z - sinkBasin.z) < sinkBasin.depth / 2 + radius
}

function itemsOnSurfaces(state: DeepReadonly<SessionState>): { itemId: string; spot: Spot }[] {
  return carriedItemIdsIn(state).flatMap((itemId) => {
    const location = itemLocationIn(state, itemId)
    return location?.kind === 'onSurface' ? [{ itemId, spot: location.spot }] : []
  })
}

function isNear(spot: Spot, other: Spot, distance: number): boolean {
  if (spot.placeId !== other.placeId || Math.abs(spot.y - other.y) > sameShelfBoardWithinMetres) return false
  return Math.hypot(spot.x - other.x, spot.z - other.z) < distance
}
