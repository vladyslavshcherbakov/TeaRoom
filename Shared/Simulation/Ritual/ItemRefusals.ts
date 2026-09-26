import { isTooHotToHold } from '../Physics/Heat.ts'
import type { Command } from './Command.ts'
import { isInvolvedInPour, refuse, type Draft } from './Draft.ts'
import { percent } from './Percent.ts'
import { isWithinReach, locationOfItem, whereIs, whereTheKeeperStands } from './Reach.ts'
import type { RefusalReason } from './RitualEvent.ts'

export type Refusal = { readonly reason: RefusalReason; readonly values: string }

export type Check = (draft: Draft) => Refusal | null

export function isKnown(itemId: string): Check {
  return (draft) => (locationOfItem(draft, itemId) === undefined ? { reason: 'unknownItem', values: '' } : null)
}

export function isNotInAHand(itemId: string): Check {
  return (draft) => (locationOfItem(draft, itemId)?.kind === 'inHand' ? { reason: 'alreadyInHand', values: '' } : null)
}

export function isNotBurntAway(itemId: string): Check {
  return (draft) => (locationOfItem(draft, itemId)?.kind === 'gone' ? { reason: 'burntAway', values: '' } : null)
}

export function isWithinTheKeepersReach(itemId: string): Check {
  return (draft) => {
    const location = locationOfItem(draft, itemId)
    if (location !== undefined && isWithinReach(draft, location)) return null
    return { reason: 'outOfReach', values: `${itemId} is ${whereIs(location)}, ${whereTheKeeperStands(draft)}` }
  }
}

export function isNotBeingPoured(itemId: string): Check {
  return (draft) => (isInvolvedInPour(draft, itemId) ? { reason: 'vesselIsBeingPoured', values: '' } : null)
}

export function isCoolEnoughToHold(itemId: string): Check {
  return (draft) => {
    const shellHeat = draft.state.vessels[itemId]?.shellHeat ?? 0
    return isTooHotToHold(shellHeat) ? { reason: 'tooHotToHold', values: `${itemId}'s metal is at ${percent(shellHeat)} of red heat` } : null
  }
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
