import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { isInAHand, isNotBurntAway, isOpenForFilling, isWithinTheKeepersReach, wasRefusedByAnyOf, type Check } from './ItemRefusals.ts'
import { caddyItemId, spoonItemId } from './Reach.ts'
import { clampedToShare } from '../Physics/ClampedToShare.ts'
import { dryLeaves } from '../Physics/Brewing.ts'

export function scoopTea(draft: Draft, command: CommandOfType<'scoopTea'>): void {
  const spoon = draft.state.spoon
  const caddy = draft.state.vessels[caddyItemId]
  if (caddy === undefined) return refuse(draft, command, 'unknownVessel', 'the room has no caddy')
  if (wasRefusedByAnyOf(draft, command, [...checksThatTheSpoonIsInAHand, isWithinTheKeepersReach(caddy.id)])) return
  if (!caddy.isLidOpen) return refuse(draft, command, 'lidClosed', 'caddy is closed')
  const gramsInTheCaddy = caddy.leaves?.grams ?? 0
  if (caddy.leaves === null || gramsInTheCaddy <= 0) return refuse(draft, command, 'caddyIsEmpty')
  if (spoon.grams >= spoon.capacityGrams) return refuse(draft, command, 'spoonIsFull', `spoon holds ${spoon.grams.toFixed(1)} g`)
  const depth = clampedToShare(command.depth)
  const grams = Math.min(spoon.capacityGrams * depth, spoon.capacityGrams - spoon.grams, gramsInTheCaddy)
  caddy.leaves = gramsInTheCaddy - grams > 0 ? { ...caddy.leaves, grams: gramsInTheCaddy - grams } : null
  spoon.grams += grams
  note(draft, `scooped ${grams.toFixed(2)} g at depth ${depth.toFixed(2)}: spoon ${spoon.grams.toFixed(2)} g, caddy ${(gramsInTheCaddy - grams).toFixed(2)} g`)
  draft.events.push({ type: 'teaScooped', grams })
}

export function tipSpoonInto(draft: Draft, command: CommandOfType<'tipSpoonInto'>): void {
  const vessel = draft.state.vessels[command.vesselId]
  const teaId = draft.state.teaId
  if (teaId === null) return refuse(draft, command, 'ritualNotStarted', 'no tea is chosen')
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel', `the room has no vessel ${command.vesselId}`)
  if (wasRefusedByAnyOf(draft, command, [...checksThatTheSpoonIsInAHand, isWithinTheKeepersReach(vessel.id), isTheSpoonHoldingLeaves, canHoldLeaves(vessel), isOpenForFilling(vessel.id)])) return
  const grams = draft.state.spoon.grams
  draft.state.spoon.grams = 0
  vessel.leaves =
    vessel.leaves === null
      ? dryLeaves(teaId, grams)
      : { ...vessel.leaves, grams: vessel.leaves.grams + grams }
  note(draft, `tipped ${grams.toFixed(2)} g of ${teaId} into ${vessel.id}, which now holds ${vessel.leaves.grams.toFixed(2)} g`)
  draft.events.push({ type: 'leavesAdded', vesselId: vessel.id, grams })
}

const checksThatTheSpoonIsInAHand: readonly Check[] = [isNotBurntAway(spoonItemId), isWithinTheKeepersReach(spoonItemId), isInAHand(spoonItemId)]

const isTheSpoonHoldingLeaves: Check = (draft) => (draft.state.spoon.grams > 0 ? null : { reason: 'spoonIsEmpty', values: 'the spoon holds no leaves' })

function canHoldLeaves(vessel: VesselState): Check {
  return (draft) => (vesselDefinitionOf(draft, vessel).canHoldLeaves ? null : { reason: 'cannotHoldLeaves', values: `${vessel.id} is not made for leaves` })
}
