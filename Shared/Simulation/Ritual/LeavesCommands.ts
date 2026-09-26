import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { isInAHand, isNotBurntAway, isOpenForFilling, isWithinTheKeepersReach, wasRefusedByAnyOf, type Check } from './ItemRefusals.ts'
import { spoonItemId, teaStockOf } from './Reach.ts'
import { clampedToShare } from '../Physics/ClampedToShare.ts'
import { dryLeaves } from '../Physics/Brewing.ts'

export function scoopTea(draft: Draft, command: CommandOfType<'scoopTea'>): void {
  const spoon = draft.state.spoon
  const caddy = draft.state.vessels[command.caddyId]
  if (caddy === undefined) return refuse(draft, command, 'unknownVessel', `the room has no vessel ${command.caddyId}`)
  if (wasRefusedByAnyOf(draft, command, [...checksThatTheSpoonIsInAHand, isWithinTheKeepersReach(caddy.id), isACaddy(caddy)])) return
  if (!caddy.isLidOpen) return refuse(draft, command, 'lidClosed', `${caddy.id} is closed`)
  const leaves = caddy.leaves
  if (leaves === null) return refuse(draft, command, 'caddyIsEmpty', `${caddy.id} holds no leaves`)
  if (spoon.grams >= spoon.capacityGrams) return refuse(draft, command, 'spoonIsFull', `spoon holds ${spoon.grams.toFixed(1)} g`)
  if (spoon.teaId !== null && spoon.teaId !== leaves.teaId) return refuse(draft, command, 'spoonHoldsAnotherTea', `the spoon holds ${spoon.grams.toFixed(2)} g of ${spoon.teaId}, ${caddy.id} holds ${leaves.teaId}`)
  const depth = clampedToShare(command.depth)
  const grams = Math.min(spoon.capacityGrams * depth, spoon.capacityGrams - spoon.grams, leaves.grams)
  caddy.leaves = leaves.grams - grams > 0 ? { ...leaves, grams: leaves.grams - grams } : null
  spoon.grams += grams
  spoon.teaId = leaves.teaId
  note(draft, `scooped ${grams.toFixed(2)} g of ${leaves.teaId} from ${caddy.id} at depth ${depth.toFixed(2)}: spoon ${spoon.grams.toFixed(2)} g, ${caddy.id} ${(leaves.grams - grams).toFixed(2)} g`)
  draft.events.push({ type: 'teaScooped', grams })
}

export function tipSpoonInto(draft: Draft, command: CommandOfType<'tipSpoonInto'>): void {
  const vessel = draft.state.vessels[command.vesselId]
  const spoon = draft.state.spoon
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel', `the room has no vessel ${command.vesselId}`)
  if (wasRefusedByAnyOf(draft, command, [...checksThatTheSpoonIsInAHand, isWithinTheKeepersReach(vessel.id), isTheSpoonHoldingLeaves, canHoldLeaves(vessel), isOpenForFilling(vessel.id), holdsNoLeavesOfAnotherTea(vessel)])) return
  const teaId = spoon.teaId
  if (teaId === null) return refuse(draft, command, 'spoonIsEmpty', `the spoon holds ${spoon.grams.toFixed(2)} g of no tea`)
  const grams = spoon.grams
  spoon.grams = 0
  spoon.teaId = null
  vessel.leaves = vessel.leaves === null ? dryLeaves(teaId, grams) : { ...vessel.leaves, grams: vessel.leaves.grams + grams }
  note(draft, `tipped ${grams.toFixed(2)} g of ${teaId} into ${vessel.id}, which now holds ${vessel.leaves.grams.toFixed(2)} g`)
  draft.events.push({ type: 'leavesAdded', vesselId: vessel.id, grams })
}

const checksThatTheSpoonIsInAHand: readonly Check[] = [isNotBurntAway(spoonItemId), isWithinTheKeepersReach(spoonItemId), isInAHand(spoonItemId)]

const isTheSpoonHoldingLeaves: Check = (draft) => (draft.state.spoon.grams > 0 ? null : { reason: 'spoonIsEmpty', values: 'the spoon holds no leaves' })

function isACaddy(vessel: VesselState): Check {
  return (draft) => (teaStockOf(draft, vessel.id) === null ? { reason: 'notACaddy', values: `the room keeps no tea in ${vessel.id}` } : null)
}

function canHoldLeaves(vessel: VesselState): Check {
  return (draft) => (vesselDefinitionOf(draft, vessel).canHoldLeaves ? null : { reason: 'cannotHoldLeaves', values: `${vessel.id} is not made for leaves` })
}

function holdsNoLeavesOfAnotherTea(vessel: VesselState): Check {
  return (draft) => {
    const teaId = draft.state.spoon.teaId
    if (vessel.leaves === null || vessel.leaves.teaId === teaId) return null
    return { reason: 'holdsLeavesOfAnotherTea', values: `${vessel.id} holds ${vessel.leaves.grams.toFixed(2)} g of ${vessel.leaves.teaId}, the spoon holds ${teaId ?? 'no tea'}` }
  }
}
