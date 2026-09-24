import { definitionIn } from '../Definitions/Catalog.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { ItemLocation } from '../State/SessionState.ts'
import type { Draft } from './Draft.ts'

export const caddyItemId = 'caddy'

export function locationOfItem(draft: Draft, itemId: string): ItemLocation | undefined {
  if (itemId === caddyItemId) return draft.state.caddy.location
  return draft.state.vessels[itemId]?.location
}

export function moveItem(draft: Draft, itemId: string, location: ItemLocation): void {
  if (itemId === caddyItemId) {
    draft.state.caddy.location = location
    return
  }
  const vessel = draft.state.vessels[itemId]
  if (vessel !== undefined) vessel.location = location
}

export function isWithinReach(draft: Draft, location: ItemLocation): boolean {
  if (location.kind === 'inHand') return true
  return draft.state.keeper.placeId === location.spot.placeId
}

export function isKeeperAt(draft: Draft, placeId: string): boolean {
  return draft.state.keeper.placeId === placeId
}

export function heaterSpotOf(draft: Draft): Spot {
  return definitionIn(draft.catalog, 'rooms', draft.state.roomId).heaterSpot
}

export function ritualPlaceOf(draft: Draft): string {
  return definitionIn(draft.catalog, 'rooms', draft.state.roomId).ritualPlaceId
}

export function whereIs(location: ItemLocation | undefined): string {
  if (location === undefined) return 'nowhere'
  if (location.kind === 'inHand') return `in hand ${location.handIndex}`
  return `on the ${location.spot.placeId}`
}

export function whereTheKeeperStands(draft: Draft): string {
  return draft.state.keeper.placeId === null ? 'the keeper is walking' : `the keeper is at the ${draft.state.keeper.placeId}`
}
