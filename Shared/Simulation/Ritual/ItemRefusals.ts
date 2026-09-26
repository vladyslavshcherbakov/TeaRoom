import type { Command } from './Command.ts'
import { isClosedAgainstFilling, isInvolvedInPour, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { rulesFor } from './ItemKinds.ts'
import { isKeeperAt, isWithinReach, locationOfItem, whereIs, whereTheKeeperStands } from './Reach.ts'
import type { RefusalReason } from './RitualEvent.ts'

export type Refusal = { readonly reason: RefusalReason; readonly values: string }

export type Check = (draft: Draft) => Refusal | null

export function isKnown(itemId: string): Check {
  return (draft) => (locationOfItem(draft, itemId) === undefined ? { reason: 'unknownItem', values: `the room has no ${itemId}` } : null)
}

export function isNotBurntAway(itemId: string): Check {
  return (draft) => (locationOfItem(draft, itemId)?.kind === 'gone' ? { reason: 'burntAway', values: `${itemId} crumbled to ash` } : null)
}

export function isWithinTheKeepersReach(itemId: string): Check {
  return (draft) => {
    const location = locationOfItem(draft, itemId)
    if (location !== undefined && isWithinReach(draft, location)) return null
    return { reason: 'outOfReach', values: `${itemId} is ${whereIs(location)}, ${whereTheKeeperStands(draft)}` }
  }
}

export function isInAHand(itemId: string): Check {
  return (draft) => {
    const location = locationOfItem(draft, itemId)
    return location?.kind === 'inHand' ? null : { reason: 'notInHand', values: `${itemId} is ${whereIs(location)}` }
  }
}

export function isNotInAHand(itemId: string): Check {
  return (draft) => {
    const location = locationOfItem(draft, itemId)
    return location?.kind === 'inHand' ? { reason: 'alreadyInHand', values: `${itemId} is ${whereIs(location)}` } : null
  }
}

export function isTheKeeperAt(placeId: string, what: string): Check {
  return (draft) => (isKeeperAt(draft, placeId) ? null : { reason: 'notAtThatPlace', values: `${whereTheKeeperStands(draft)}, ${what} is at the ${placeId}` })
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
    const isClosedAgainstPouring = vessel !== undefined && vesselDefinitionOf(draft, vessel).lid?.mustBeOpenToPour === true && !vessel.isLidOpen
    return isClosedAgainstPouring ? { reason: 'lidClosed', values: `${vesselId} must be open to pour` } : null
  }
}

export function isCoolEnoughToHold(itemId: string): Check {
  return (draft) => rulesFor(draft.state, itemId)?.refusalToHold(draft, itemId) ?? null
}

export function wasRefusedByAnyOf(draft: Draft, command: Command, checks: readonly Check[]): boolean {
  for (const check of checks) {
    const refusal = check(draft)
    if (refusal === null) continue
    refuse(draft, command, refusal.reason, refusal.values)
    return true
  }
  return false
}
