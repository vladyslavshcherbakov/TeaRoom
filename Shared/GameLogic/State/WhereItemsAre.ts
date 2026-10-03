import type { Spot } from '../Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import type { HandIndex, InventorySlot, ItemLocation, SessionState } from './SessionState.ts'
import { componentAcross, entityIdsAcross, firstEntityAcross, type Table } from '../../Engine/World.ts'

export type ItemsInTheHands = readonly [string | null, string | null]

export type ItemsInTheInventory = readonly [string | null, string | null]

type ItemHolders<Holder> = {
  readonly spoon: Holder
  readonly cloths: Readonly<Record<string, Holder>>
  readonly vessels: Readonly<Record<string, Holder>>
}

export const spoonItemId = 'spoon'

type CarriedItem = { readonly location: DeepReadonly<ItemLocation> }

export function carriedItemIdsIn(state: DeepReadonly<SessionState>): readonly string[] {
  return entityIdsAcross(tablesOfCarriedItems<CarriedItem>(state))
}

export function isACloth(state: DeepReadonly<SessionState>, itemId: string): boolean {
  return state.cloths[itemId] !== undefined
}

export function itemLocationIn(state: DeepReadonly<SessionState>, itemId: string): DeepReadonly<ItemLocation> | undefined {
  return componentAcross(tablesOfCarriedItems<CarriedItem>(state), itemId)?.location
}

export function itemWithItsLocationIn(state: SessionState, itemId: string): { location: ItemLocation } | undefined {
  return componentAcross(tablesOfCarriedItems<{ location: ItemLocation }>(state), itemId)
}

export function itemIdsInTheHands(state: DeepReadonly<SessionState>): ItemsInTheHands {
  return [itemIdInHand(state, 0), itemIdInHand(state, 1)]
}

export function itemIdInHand(state: DeepReadonly<SessionState>, handIndex: HandIndex): string | null {
  return firstEntityAcross(tablesOfCarriedItems<CarriedItem>(state), ({ location }) => location.kind === 'inHand' && location.handIndex === handIndex)
}

export function itemIdsInTheInventory(state: DeepReadonly<SessionState>): ItemsInTheInventory {
  return [itemIdInTheInventory(state, 0), itemIdInTheInventory(state, 1)]
}

export function itemIdInTheInventory(state: DeepReadonly<SessionState>, slotIndex: InventorySlot): string | null {
  return firstEntityAcross(tablesOfCarriedItems<CarriedItem>(state), ({ location }) => location.kind === 'inTheInventory' && location.slotIndex === slotIndex)
}

export function itemIdOnTheHeater(state: DeepReadonly<SessionState>): string | null {
  return firstEntityAcross(tablesOfCarriedItems<CarriedItem>(state), ({ location }) => location.kind === 'onTheHeater')
}

export function itemIdInTheSink(state: DeepReadonly<SessionState>): string | null {
  return firstEntityAcross(tablesOfCarriedItems<CarriedItem>(state), ({ location }) => location.kind === 'inTheSink')
}

export function standingSpotOf(location: DeepReadonly<ItemLocation> | undefined): DeepReadonly<Spot> | null {
  if (location === undefined) return null
  switch (location.kind) {
    case 'onSurface':
    case 'onTheHeater':
    case 'inTheSink':
      return location.spot
    case 'inHand':
    case 'inTheInventory':
    case 'gone':
      return null
  }
}

export function whereIs(location: DeepReadonly<ItemLocation> | undefined): string {
  if (location === undefined) return 'nowhere'
  switch (location.kind) {
    case 'inHand':
      return `in hand ${location.handIndex}`
    case 'inTheInventory':
      return `in place ${location.slotIndex} of the inventory`
    case 'onSurface':
      return `on the ${location.spot.placeId}`
    case 'onTheHeater':
      return 'on the heater'
    case 'inTheSink':
      return 'in the sink'
    case 'gone':
      return 'gone'
  }
}

function tablesOfCarriedItems<Item>(holders: ItemHolders<Item>): readonly Readonly<Table<Item>>[] {
  return [holders.vessels, { [spoonItemId]: holders.spoon }, holders.cloths]
}
