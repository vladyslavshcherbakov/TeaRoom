import { definitionIn } from '../Definitions/Catalog.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import type { ItemLocation, SessionState } from '../State/SessionState.ts'
import type { Draft } from './Draft.ts'

export const caddyItemId = 'caddy'
export const spoonItemId = 'spoon'
export const clothItemId = 'cloth'

export function carriedItemIdsIn(state: DeepReadonly<SessionState>): readonly string[] {
  return [...Object.keys(state.vessels), caddyItemId, spoonItemId, clothItemId]
}

export function itemLocationIn(state: DeepReadonly<SessionState>, itemId: string): DeepReadonly<ItemLocation> | undefined {
  switch (itemId) {
    case caddyItemId:
      return state.caddy.location
    case spoonItemId:
      return state.spoon.location
    case clothItemId:
      return state.cloth.location
    default:
      return state.vessels[itemId]?.location
  }
}

export function locationOfItem(draft: Draft, itemId: string): ItemLocation | undefined {
  return holderOfItem(draft, itemId)?.location
}

export function moveItem(draft: Draft, itemId: string, location: ItemLocation): void {
  const holder = holderOfItem(draft, itemId)
  if (holder !== undefined) holder.location = location
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

function holderOfItem(draft: Draft, itemId: string): { location: ItemLocation } | undefined {
  switch (itemId) {
    case caddyItemId:
      return draft.state.caddy
    case spoonItemId:
      return draft.state.spoon
    case clothItemId:
      return draft.state.cloth
    default:
      return draft.state.vessels[itemId]
  }
}

export function whereTheKeeperStands(draft: Draft): string {
  return draft.state.keeper.placeId === null ? 'the keeper is walking' : `the keeper is at the ${draft.state.keeper.placeId}`
}
