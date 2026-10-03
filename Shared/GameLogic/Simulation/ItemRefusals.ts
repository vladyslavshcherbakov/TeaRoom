import { isClosedAgainstFilling, isInvolvedInPour, vesselDefinitionOf, type Draft } from './Draft.ts'
import { found, refusedWith, type Check as EngineCheck, type Found } from '../../Engine/Commands.ts'
import { rulesFor } from './ItemKinds.ts'
import { itemLocationIn } from '../State/WhereItemsAre.ts'
import { isPlayerAt, isWithinReach, whereTheItemIs, whereThePlayerStands } from './Reach.ts'
import type { RefusalReason } from './TeaEvent.ts'
import type { VesselState } from '../State/SessionState.ts'
import { isClosedAgainstPouring } from '../State/Lids.ts'

export type Check = EngineCheck<Draft, RefusalReason>

export function foundVessel(draft: Draft, vesselId: string): Found<VesselState, RefusalReason> {
  const vessel = draft.state.vessels[vesselId]
  return vessel === undefined ? refusedWith('unknownVessel', `the room has no vessel ${vesselId}`) : found(vessel)
}

export function isKnown(itemId: string): Check {
  return (draft) => (itemLocationIn(draft.state, itemId) === undefined ? { reason: 'unknownItem', values: `the room has no ${itemId}` } : null)
}

export function isNotBurntAway(itemId: string): Check {
  return (draft) => (itemLocationIn(draft.state, itemId)?.kind === 'gone' ? { reason: 'burntAway', values: `${itemId} crumbled to ash` } : null)
}

export function isWithinThePlayersReach(itemId: string): Check {
  return (draft) => {
    const location = itemLocationIn(draft.state, itemId)
    if (location !== undefined && isWithinReach(draft, location)) return null
    return { reason: 'outOfReach', values: `${itemId} is ${whereTheItemIs(draft.state, itemId)}, ${whereThePlayerStands(draft)}` }
  }
}

export function isWithinReachOrPutAway(itemId: string): Check {
  return (draft) => (itemLocationIn(draft.state, itemId)?.kind === 'inTheInventory' ? null : isWithinThePlayersReach(itemId)(draft))
}

export function isNotPutAway(itemId: string): Check {
  return (draft) => (itemLocationIn(draft.state, itemId)?.kind === 'inTheInventory' ? { reason: 'alreadyPutAway', values: `${itemId} is ${whereTheItemIs(draft.state, itemId)}` } : null)
}

export function isInAHand(itemId: string): Check {
  return (draft) => {
    const location = itemLocationIn(draft.state, itemId)
    return location?.kind === 'inHand' ? null : { reason: 'notInHand', values: `${itemId} is ${whereTheItemIs(draft.state, itemId)}` }
  }
}

export function isNotInAHand(itemId: string): Check {
  return (draft) => {
    const location = itemLocationIn(draft.state, itemId)
    return location?.kind === 'inHand' ? { reason: 'alreadyInHand', values: `${itemId} is ${whereTheItemIs(draft.state, itemId)}` } : null
  }
}

export function isThePlayerAt(placeId: string, what: string): Check {
  return (draft) => (isPlayerAt(draft, placeId) ? null : { reason: 'notAtThatPlace', values: `${whereThePlayerStands(draft)}, ${what} is at the ${placeId}` })
}

export function isNotBeingPoured(itemId: string): Check {
  return (draft) => {
    const pour = draft.state.pour
    if (pour === null || !isInvolvedInPour(draft, itemId)) return null
    return { reason: 'vesselIsBeingPoured', values: `${pour.sourceId} pours into ${pour.targetId ?? 'the table'}` }
  }
}

export function isOpenForFilling(vesselId: string): Check {
  return (draft) => {
    const vessel = draft.state.vessels[vesselId]
    return vessel !== undefined && isClosedAgainstFilling(draft, vessel) ? { reason: 'lidClosed', values: `${vesselId} must be open to be filled` } : null
  }
}

export function isOpenForPouring(vesselId: string): Check {
  return (draft) => {
    const vessel = draft.state.vessels[vesselId]
    return vessel !== undefined && isClosedAgainstPouring(vessel, vesselDefinitionOf(draft, vessel)) ? { reason: 'lidClosed', values: `${vesselId} must be open to pour` } : null
  }
}

export function isCoolEnoughToHold(itemId: string): Check {
  return (draft) => rulesFor(draft.state, itemId)?.refusalToHold(draft, itemId) ?? null
}
