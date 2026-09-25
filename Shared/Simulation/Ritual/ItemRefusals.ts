import { isTooHotToHold } from '../Physics/Heat.ts'
import type { Command } from './Command.ts'
import { isInvolvedInPour, refuse, type Draft } from './Draft.ts'
import { percent } from './Percent.ts'
import { isWithinReach, locationOfItem, whereIs, whereTheKeeperStands } from './Reach.ts'
import type { RefusalReason } from './RitualEvent.ts'

export type Refusal = { readonly reason: RefusalReason; readonly values: string }

export type ItemCheck = (draft: Draft, itemId: string) => Refusal | null

export const isKnown: ItemCheck = (draft, itemId) => (locationOfItem(draft, itemId) === undefined ? { reason: 'unknownItem', values: '' } : null)

export const isNotInAHand: ItemCheck = (draft, itemId) => (locationOfItem(draft, itemId)?.kind === 'inHand' ? { reason: 'alreadyInHand', values: '' } : null)

export const isNotBurntAway: ItemCheck = (draft, itemId) => (locationOfItem(draft, itemId)?.kind === 'gone' ? { reason: 'burntAway', values: '' } : null)

export const isWithinTheKeepersReach: ItemCheck = (draft, itemId) => {
  const location = locationOfItem(draft, itemId)
  if (location !== undefined && isWithinReach(draft, location)) return null
  return { reason: 'outOfReach', values: `${itemId} is ${whereIs(location)}, ${whereTheKeeperStands(draft)}` }
}

export const isNotBeingPoured: ItemCheck = (draft, itemId) => (isInvolvedInPour(draft, itemId) ? { reason: 'vesselIsBeingPoured', values: '' } : null)

export const isCoolEnoughToHold: ItemCheck = (draft, itemId) => {
  const shellHeat = draft.state.vessels[itemId]?.shellHeat ?? 0
  return isTooHotToHold(shellHeat) ? { reason: 'tooHotToHold', values: `${itemId}'s metal is at ${percent(shellHeat)} of red heat` } : null
}

export function wasRefusedByAnyOf(draft: Draft, command: Command, itemId: string, checks: readonly ItemCheck[]): boolean {
  for (const check of checks) {
    const refusal = check(draft, itemId)
    if (refusal === null) continue
    refuse(draft, command, refusal.reason, refusal.values)
    return true
  }
  return false
}
