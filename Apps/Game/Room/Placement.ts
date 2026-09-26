import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { carriedItemIdsIn, itemLocationIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { footprintCirclesOf, isTheLidOpen, layoutOf } from './CarriedShapes.ts'
import { heaterPlate, turnedBy, turnOfItemAt, type FloorPoint, type RoomLayout, type SinkBasin } from './RoomLayout.ts'

const sameShelfBoardWithinMetres = 0.15
const openLidGapMetres = 0.01
const openLidDirectionsRadians = [Math.PI, 0, Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, Math.PI / 4, (-3 * Math.PI) / 4, -Math.PI / 4]

type Circle = { readonly spot: Spot; readonly radius: number; readonly restsOnTheSurface: boolean }

export type Surroundings = {
  readonly layout: RoomLayout
  readonly heaterSpot: Spot
}

export type PlacementRefusal = 'offTheEdge' | 'theTopTakesNoItems' | 'somethingIsThere' | 'theHeaterIsThere' | 'theSinkIsThere'

export type LyingLid = {
  readonly itemId: string
  readonly offset: FloorPoint
  readonly spot: Spot
  readonly radius: number
}

export function whyThereIsNoRoomFor(itemId: string, spot: Spot, state: DeepReadonly<SessionState>, surroundings: Surroundings): PlacementRefusal | null {
  const circles = footprintOf(state, itemId, spot, surroundings.layout)
  const refusal = whyThereIsNoRoomForCircles(circles, itemId, state, surroundings)
  if (refusal !== null) return refusal
  const lidsOfOtherItems = lidsLyingOpen(state, surroundings).filter((lid) => lid.itemId !== itemId)
  return lidsOfOtherItems.some((lid) => circles.some((circle) => isNear(circle.spot, lid.spot, circle.radius + lid.radius))) ? 'somethingIsThere' : null
}

export function lidsLyingOpen(state: DeepReadonly<SessionState>, surroundings: Surroundings): readonly LyingLid[] {
  return itemsOnSurfaces(state).reduce<readonly LyingLid[]>((lidsLaidBefore, { itemId, spot }) => {
    const lid = openLidBeside(itemId, spot, lidsLaidBefore, state, surroundings)
    return lid === null ? lidsLaidBefore : [...lidsLaidBefore, lid]
  }, [])
}

function whyThereIsNoRoomForCircles(circles: readonly Circle[], movingItemId: string | null, state: DeepReadonly<SessionState>, surroundings: Surroundings): PlacementRefusal | null {
  const { layout, heaterSpot } = surroundings
  for (const { spot, radius } of circles.filter((circle) => circle.restsOnTheSurface)) {
    const piece = layout.furniture.find((candidate) => candidate.id === spot.placeId)
    if (piece === undefined) return 'offTheEdge'
    if (!piece.takesItemsOnItsTop && spot.y > piece.height - sameShelfBoardWithinMetres) return 'theTopTakesNoItems'
    const { footprint } = piece
    const isInsideTheTop = Math.abs(spot.x - footprint.x) <= footprint.width / 2 - radius && Math.abs(spot.z - footprint.z) <= footprint.depth / 2 - radius
    if (!isInsideTheTop) return 'offTheEdge'
    if (overlapsTheHeater(heaterSpot, spot, radius)) return 'theHeaterIsThere'
    if (spot.placeId === layout.sinkBasin.placeId && overlapsTheSink(layout.sinkBasin, spot, radius)) return 'theSinkIsThere'
  }
  const neighbourCircles = itemsOnSurfaces(state).filter((item) => item.itemId !== movingItemId).flatMap((item) => footprintOf(state, item.itemId, item.spot, layout))
  const isTouchingANeighbour = circles.some((circle) => neighbourCircles.some((neighbour) => isNear(circle.spot, neighbour.spot, circle.radius + neighbour.radius)))
  return isTouchingANeighbour ? 'somethingIsThere' : null
}

function footprintOf(state: DeepReadonly<SessionState>, itemId: string, spot: Spot, roomLayout: RoomLayout): Circle[] {
  const shapeLayout = layoutOf(state, itemId)
  if (shapeLayout === undefined) return []
  const turn = turnOfItemAt(roomLayout, spot)
  return footprintCirclesOf(shapeLayout).map((circle) => ({ spot: offsetSpot(spot, turnedBy(circle, turn)), radius: circle.radius, restsOnTheSurface: circle.restsOnTheSurface }))
}

function openLidBeside(itemId: string, spot: Spot, lidsLaidBefore: readonly LyingLid[], state: DeepReadonly<SessionState>, surroundings: Surroundings): LyingLid | null {
  const layout = layoutOf(state, itemId)
  if (layout === undefined || layout.lid === null || !isTheLidOpen(state, itemId) || state.sink.itemIdInside === itemId) return null
  const radius = layout.lid.lyingRadiusMetres
  const distance = layout.footprintRadiusMetres + radius + openLidGapMetres
  const turn = turnOfItemAt(surroundings.layout, spot)
  const lidsInEveryDirection = openLidDirectionsRadians.map((direction) => {
    const offset = turnedBy({ x: Math.cos(direction) * distance, z: Math.sin(direction) * distance }, turn)
    return { itemId, offset, spot: offsetSpot(spot, offset), radius }
  })
  return lidsInEveryDirection.find((lid) => hasRoomForTheLid(lid, lidsLaidBefore, state, surroundings)) ?? null
}

function hasRoomForTheLid(lid: LyingLid, lidsLaidBefore: readonly LyingLid[], state: DeepReadonly<SessionState>, surroundings: Surroundings): boolean {
  const isClearOfTheRoom = whyThereIsNoRoomForCircles([{ spot: lid.spot, radius: lid.radius, restsOnTheSurface: true }], null, state, surroundings) === null
  return isClearOfTheRoom && !lidsLaidBefore.some((laid) => isNear(lid.spot, laid.spot, lid.radius + laid.radius))
}

function offsetSpot(spot: Spot, offset: FloorPoint): Spot {
  return { ...spot, x: spot.x + offset.x, z: spot.z + offset.z }
}

function overlapsTheHeater(heaterSpot: Spot, spot: Spot, radius: number): boolean {
  if (!isNear(spot, heaterSpot, Number.POSITIVE_INFINITY)) return false
  const nearestX = Math.min(Math.max(spot.x, heaterSpot.x - heaterPlate.width / 2), heaterSpot.x + heaterPlate.width / 2)
  const nearestZ = Math.min(Math.max(spot.z, heaterSpot.z - heaterPlate.depth / 2), heaterSpot.z + heaterPlate.depth / 2)
  return Math.hypot(spot.x - nearestX, spot.z - nearestZ) < radius
}

function overlapsTheSink(sinkBasin: SinkBasin, spot: Spot, radius: number): boolean {
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
