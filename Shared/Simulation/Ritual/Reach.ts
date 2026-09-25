import { definitionIn } from '../Definitions/Catalog.ts'
import type { Spot, TapDefinition } from '../Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import type { HandIndex, ItemLocation, SessionState } from '../State/SessionState.ts'
import { note, type Draft } from './Draft.ts'

type ItemHolders<Holder> = {
  readonly spoon: Holder
  readonly cloths: Readonly<Record<string, Holder>>
  readonly vessels: Readonly<Record<string, Holder>>
}

export const caddyItemId = 'caddy'
export const spoonItemId = 'spoon'

export function carriedItemIdsIn(state: DeepReadonly<SessionState>): readonly string[] {
  return [...Object.keys(state.vessels), spoonItemId, ...Object.keys(state.cloths)]
}

export function isACloth(state: DeepReadonly<SessionState>, itemId: string): boolean {
  return state.cloths[itemId] !== undefined
}

export function itemLocationIn(state: DeepReadonly<SessionState>, itemId: string): DeepReadonly<ItemLocation> | undefined {
  return holderIn<{ readonly location: DeepReadonly<ItemLocation> }>(state, itemId)?.location
}

export function locationOfItem(draft: Draft, itemId: string): ItemLocation | undefined {
  return holderIn<{ location: ItemLocation }>(draft.state, itemId)?.location
}

export const middleHandIndex = 2

export function emptyTheHand(draft: Draft, handIndex: HandIndex): void {
  draft.state.keeper.hands[handIndex] = null
  if (handIndex !== middleHandIndex) return
  draft.state.keeper.hasAMiddleHand = false
  note(draft, 'the middle hand is empty, and it is gone for good')
  draft.events.push({ type: 'middleHandVanished' })
}

export function moveItem(draft: Draft, itemId: string, location: ItemLocation): void {
  const holder = holderIn<{ location: ItemLocation }>(draft.state, itemId)
  if (holder !== undefined) holder.location = location
}

export function isWithinReach(draft: Draft, location: ItemLocation): boolean {
  switch (location.kind) {
    case 'inHand':
      return true
    case 'onSurface':
      return draft.state.keeper.placeId === location.spot.placeId
    case 'gone':
      return false
  }
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
  switch (location.kind) {
    case 'inHand':
      return `in hand ${location.handIndex}`
    case 'onSurface':
      return `on the ${location.spot.placeId}`
    case 'gone':
      return 'gone'
  }
}

export function whereTheKeeperStands(draft: Draft): string {
  return draft.state.keeper.placeId === null ? 'the keeper is walking' : `the keeper is at the ${draft.state.keeper.placeId}`
}

function holderIn<Holder>(holders: ItemHolders<Holder>, itemId: string): Holder | undefined {
  if (itemId === spoonItemId) return holders.spoon
  return holders.cloths[itemId] ?? holders.vessels[itemId]
}
