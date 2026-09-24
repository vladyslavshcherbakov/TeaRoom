import { definitionIn } from '../Definitions/Catalog.ts'
import type { Spot, TapDefinition } from '../Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import type { ItemLocation, SessionState } from '../State/SessionState.ts'
import type { Draft } from './Draft.ts'

type ItemHolders<Holder> = {
  readonly caddy: Holder
  readonly spoon: Holder
  readonly cloth: Holder
  readonly vessels: Readonly<Record<string, Holder>>
}

export const caddyItemId = 'caddy'
export const spoonItemId = 'spoon'
export const clothItemId = 'cloth'

export function carriedItemIdsIn(state: DeepReadonly<SessionState>): readonly string[] {
  return [...Object.keys(state.vessels), caddyItemId, spoonItemId, clothItemId]
}

export function itemLocationIn(state: DeepReadonly<SessionState>, itemId: string): DeepReadonly<ItemLocation> | undefined {
  return holderIn<{ readonly location: DeepReadonly<ItemLocation> }>(state, itemId)?.location
}

export function locationOfItem(draft: Draft, itemId: string): ItemLocation | undefined {
  return holderIn<{ location: ItemLocation }>(draft.state, itemId)?.location
}

export function moveItem(draft: Draft, itemId: string, location: ItemLocation): void {
  const holder = holderIn<{ location: ItemLocation }>(draft.state, itemId)
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

export function tapOf(draft: Draft): TapDefinition | null {
  return definitionIn(draft.catalog, 'rooms', draft.state.roomId).tap
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

function holderIn<Holder>(holders: ItemHolders<Holder>, itemId: string): Holder | undefined {
  switch (itemId) {
    case caddyItemId:
      return holders.caddy
    case spoonItemId:
      return holders.spoon
    case clothItemId:
      return holders.cloth
    default:
      return holders.vessels[itemId]
  }
}
