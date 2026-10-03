import { type Catalog } from '../Definitions/Catalog.ts'
import { definitionIn } from '../../Engine/Catalog.ts'
import { isHeating } from '../Judgement/HeaterModes.ts'
import type { Spot, TapDefinition, TeaStock } from '../Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import type { ItemLocation, SessionState } from '../State/SessionState.ts'
import { itemLocationIn, whereIs } from '../State/WhereItemsAre.ts'
import type { Draft } from './Draft.ts'

export function isWithinReach(draft: Draft, location: DeepReadonly<ItemLocation>): boolean {
  switch (location.kind) {
    case 'inHand':
      return true
    case 'onSurface':
    case 'onTheHeater':
    case 'inTheSink':
      return draft.state.player.placeId === location.spot.placeId
    case 'inTheInventory':
    case 'gone':
      return false
  }
}

export function isPlayerAt(draft: Draft, placeId: string): boolean {
  return draft.state.player.placeId === placeId
}

export function heaterSpotOf(draft: Draft): Spot {
  return definitionIn(draft.catalog, 'rooms', draft.state.roomId).heaterSpot
}

export function tapOf(draft: Draft): TapDefinition | null {
  return definitionIn(draft.catalog, 'rooms', draft.state.roomId).tap
}

export function teaStockOf(draft: Draft, vesselId: string): TeaStock | null {
  return teaStockIn(draft.catalog, draft.state, vesselId)
}

export function teaStockIn(catalog: Catalog, state: DeepReadonly<SessionState>, vesselId: string): TeaStock | null {
  return definitionIn(catalog, 'rooms', state.roomId).vessels.find((vessel) => vessel.id === vesselId)?.teaStock ?? null
}

export function whereTheItemIs(state: DeepReadonly<SessionState>, itemId: string): string {
  const location = itemLocationIn(state, itemId)
  if (location?.kind === 'onTheHeater') return `on the ${isHeating(state.heater.mode) ? 'working' : 'cold'} heater`
  return whereIs(location)
}

export function whereThePlayerStands(draft: Draft): string {
  return draft.state.player.placeId === null ? 'the player is walking' : `the player is at the ${draft.state.player.placeId}`
}
