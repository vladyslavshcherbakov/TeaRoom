import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { carriedItemIdsIn, itemLocationIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { carriedShapeOf, footprintRadiusMetres, furniture, heaterFootprintRadiusMetres } from './RoomLayout.ts'

const sameShelfBoardWithinMetres = 0.15

export type PlacementRefusal = 'offTheEdge' | 'somethingIsThere' | 'theHeaterIsThere'

export function whyThereIsNoRoomFor(itemId: string, spot: Spot, state: DeepReadonly<SessionState>, heaterSpot: Spot): PlacementRefusal | null {
  const radius = footprintRadiusOf(state, itemId)
  const piece = furniture.find((candidate) => candidate.id === spot.placeId)
  if (piece === undefined) return 'offTheEdge'
  const { footprint } = piece
  const isInsideTheTop = Math.abs(spot.x - footprint.x) <= footprint.width / 2 - radius && Math.abs(spot.z - footprint.z) <= footprint.depth / 2 - radius
  if (!isInsideTheTop) return 'offTheEdge'
  if (isNear(spot, heaterSpot, radius + heaterFootprintRadiusMetres)) return 'theHeaterIsThere'
  const neighbours = itemsOnSurfaces(state).filter((item) => item.itemId !== itemId)
  if (neighbours.some((item) => isNear(spot, item.spot, radius + footprintRadiusOf(state, item.itemId)))) return 'somethingIsThere'
  return null
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

function footprintRadiusOf(state: DeepReadonly<SessionState>, itemId: string): number {
  const shape = carriedShapeOf(state, itemId)
  return shape === undefined ? 0 : footprintRadiusMetres[shape]
}
