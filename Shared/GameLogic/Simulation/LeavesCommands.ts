import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { describeTheLeaves, describeTheSteepingTimes, vesselDefinitionOf, type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRuleOnASubject, refuse } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import { foundVessel, isInAHand, isNotBurntAway, isOpenForFilling, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'
import { spoonItemId } from '../State/WhereItemsAre.ts'
import { teaStockOf } from './Reach.ts'
import { clampedToShare } from '../../Engine/ClampedToShare.ts'
import { dryLeaves, gramsAScoopTakes, leafGramsTogether, leavesWithMoreAdded, splitLeafGrams, totalLeafGrams } from '../Chemistry/Brewing.ts'

export const scoopTeaRule: TeaCommandEntry<'scoopTea'> = commandRuleOnASubject({
  find: (draft, command) => foundVessel(draft, command.caddyId),
  checks: (caddy) => [...checksThatTheSpoonIsInAHand, isWithinThePlayersReach(caddy.id), isACaddy(caddy)],
  carryOut: scoopTea,
})

export const tipSpoonIntoRule: TeaCommandEntry<'tipSpoonInto'> = commandRuleOnASubject({
  find: (draft, command) => foundVessel(draft, command.vesselId),
  checks: (vessel) => [...checksThatTheSpoonIsInAHand, isWithinThePlayersReach(vessel.id), isTheSpoonHoldingLeaves, canHoldLeaves(vessel), isNotACaddy(vessel), isOpenForFilling(vessel.id)],
  carryOut: tipSpoonInto,
})

function scoopTea(draft: Draft, caddy: VesselState, command: CommandOfType<'scoopTea'>): void {
  const spoon = draft.state.spoon
  if (!caddy.isLidOpen) return refuse(draft, command, 'lidClosed', `${caddy.id} is closed`)
  const leaves = caddy.leaves
  if (leaves === null) return refuse(draft, command, 'caddyIsEmpty', `${caddy.id} holds no leaves`)
  const gramsOnTheSpoon = totalLeafGrams(spoon.gramsByTeaId)
  if (gramsOnTheSpoon >= spoon.capacityGrams) return refuse(draft, command, 'spoonIsFull', `spoon holds ${gramsOnTheSpoon.toFixed(1)} g`)
  const depth = clampedToShare(command.depth)
  const grams = gramsAScoopTakes(spoon.capacityGrams, depth, gramsOnTheSpoon, totalLeafGrams(leaves.gramsByTeaId))
  const { taken, left } = splitLeafGrams(leaves.gramsByTeaId, grams)
  caddy.leaves = totalLeafGrams(left) > 0 ? { ...leaves, gramsByTeaId: left } : null
  spoon.gramsByTeaId = leafGramsTogether(spoon.gramsByTeaId, taken)
  note(draft, `scooped ${describeTheLeaves(taken)} from ${caddy.id} at depth ${depth.toFixed(2)}: the spoon holds ${describeTheLeaves(spoon.gramsByTeaId)}, ${caddy.id} ${describeTheLeaves(left)}`)
  draft.events.push({ type: 'teaScooped', grams })
}

function tipSpoonInto(draft: Draft, vessel: VesselState): void {
  const spoon = draft.state.spoon
  const leavesFromTheSpoon = spoon.gramsByTeaId
  spoon.gramsByTeaId = {}
  vessel.leaves = vessel.leaves === null ? dryLeaves(leavesFromTheSpoon) : leavesWithMoreAdded(vessel.leaves, leavesFromTheSpoon)
  const steeping = vessel.leaves.isSteeping ? `, steeping for ${describeTheSteepingTimes(vessel.leaves, 1)}` : ''
  note(draft, `tipped ${describeTheLeaves(leavesFromTheSpoon)} into ${vessel.id}, which now holds ${describeTheLeaves(vessel.leaves.gramsByTeaId)}${steeping}`)
  draft.events.push({ type: 'leavesAdded', vesselId: vessel.id, grams: totalLeafGrams(leavesFromTheSpoon) })
}

const checksThatTheSpoonIsInAHand: readonly Check[] = [isNotBurntAway(spoonItemId), isWithinThePlayersReach(spoonItemId), isInAHand(spoonItemId)]

const isTheSpoonHoldingLeaves: Check = (draft) => (totalLeafGrams(draft.state.spoon.gramsByTeaId) > 0 ? null : { reason: 'spoonIsEmpty', values: 'the spoon holds no leaves' })

function isACaddy(vessel: VesselState): Check {
  return (draft) => (teaStockOf(draft, vessel.id) === null ? { reason: 'notACaddy', values: `the room keeps no tea in ${vessel.id}` } : null)
}

function isNotACaddy(vessel: VesselState): Check {
  return (draft) => (teaStockOf(draft, vessel.id) === null ? null : { reason: 'caddyTakesNoLeaves', values: `${vessel.id} is a caddy, and leaves only come out of a caddy` })
}

function canHoldLeaves(vessel: VesselState): Check {
  return (draft) => (vesselDefinitionOf(draft, vessel).canHoldLeaves ? null : { reason: 'cannotHoldLeaves', values: `${vessel.id} is not made for leaves` })
}
