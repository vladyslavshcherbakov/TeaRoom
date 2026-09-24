import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { caddyItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { ItemLocation, SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { carriedItemShapes, footprintRadiusMetres, furniture, heaterFootprintRadiusMetres } from './RoomLayout.ts'

const sameShelfBoardWithinMetres = 0.15

export type PlacementRefusal = 'offTheEdge' | 'somethingIsThere' | 'theHeaterIsThere'

export function whyThereIsNoRoomFor(itemId: string, spot: Spot, state: DeepReadonly<SessionState>, heaterSpot: Spot): PlacementRefusal | null {
  const radius = footprintRadiusOf(itemId)
  const piece = furniture.find((candidate) => candidate.id === spot.placeId)
  if (piece === undefined) return 'offTheEdge'
  const { footprint } = piece
  const isInsideTheTop = Math.abs(spot.x - footprint.x) <= footprint.width / 2 - radius && Math.abs(spot.z - footprint.z) <= footprint.depth / 2 - radius
  if (!isInsideTheTop) return 'offTheEdge'
  if (isNear(spot, heaterSpot, radius + heaterFootprintRadiusMetres)) return 'theHeaterIsThere'
  const neighbours = itemsOnSurfaces(state).filter((item) => item.itemId !== itemId)
  if (neighbours.some((item) => isNear(spot, item.spot, radius + footprintRadiusOf(item.itemId)))) return 'somethingIsThere'
  return null
}

function itemsOnSurfaces(state: DeepReadonly<SessionState>): { itemId: string; spot: Spot }[] {
  const locations: [string, DeepReadonly<ItemLocation>][] = [
    ...Object.values(state.vessels).map((vessel): [string, DeepReadonly<ItemLocation>] => [vessel.id, vessel.location]),
    [caddyItemId, state.caddy.location],
  ]
  return locations.flatMap(([itemId, location]) => (location.kind === 'onSurface' ? [{ itemId, spot: location.spot }] : []))
}

function isNear(spot: Spot, other: Spot, distance: number): boolean {
  if (spot.placeId !== other.placeId || Math.abs(spot.y - other.y) > sameShelfBoardWithinMetres) return false
  return Math.hypot(spot.x - other.x, spot.z - other.z) < distance
}

function footprintRadiusOf(itemId: string): number {
  const shape = carriedItemShapes[itemId]
  return shape === undefined ? 0 : footprintRadiusMetres[shape]
}
