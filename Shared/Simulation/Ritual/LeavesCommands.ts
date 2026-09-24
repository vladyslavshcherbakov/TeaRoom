import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { isKeeperAt, isWithinReach, ritualPlaceOf, whereIs, whereTheKeeperStands } from './Reach.ts'

export function scoopTea(draft: Draft, command: CommandOfType<'scoopTea'>): void {
  const { caddy, spoon } = draft.state
  if (!isKeeperAt(draft, ritualPlaceOf(draft))) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the spoon is at the ${ritualPlaceOf(draft)}`)
  if (!isWithinReach(draft, caddy.location)) return refuse(draft, command, 'outOfReach', `the caddy is ${whereIs(caddy.location)}`)
  if (!caddy.isOpen) return refuse(draft, command, 'lidClosed', 'caddy is closed')
  if (caddy.grams <= 0) return refuse(draft, command, 'caddyIsEmpty')
  if (spoon.grams >= spoon.capacityGrams) return refuse(draft, command, 'spoonIsFull', `spoon holds ${spoon.grams.toFixed(1)} g`)
  const depth = Math.min(1, Math.max(0, command.depth))
  const grams = Math.min(spoon.capacityGrams * depth, spoon.capacityGrams - spoon.grams, caddy.grams)
  caddy.grams -= grams
  spoon.grams += grams
  note(draft, `scooped ${grams.toFixed(2)} g at depth ${depth.toFixed(2)}: spoon ${spoon.grams.toFixed(2)} g, caddy ${caddy.grams.toFixed(2)} g`)
  draft.events.push({ type: 'teaScooped', grams })
}

export function tipSpoonInto(draft: Draft, command: CommandOfType<'tipSpoonInto'>): void {
  const vessel = draft.state.vessels[command.vesselId]
  const teaId = draft.state.caddy.teaId
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  if (draft.state.spoon.grams <= 0 || teaId === null) return refuse(draft, command, 'spoonIsEmpty')
  if (!isKeeperAt(draft, ritualPlaceOf(draft))) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the spoon is at the ${ritualPlaceOf(draft)}`)
  if (!isWithinReach(draft, vessel.location)) return refuse(draft, command, 'outOfReach', `${vessel.id} is ${whereIs(vessel.location)}`)
  const definition = vesselDefinitionOf(draft, vessel)
  if (!definition.canHoldLeaves) return refuse(draft, command, 'cannotHoldLeaves')
  if (definition.lid?.mustBeOpenToFill === true && !vessel.isLidOpen) {
    return refuse(draft, command, 'lidClosed', `spoon keeps ${draft.state.spoon.grams.toFixed(2)} g`)
  }
  const grams = draft.state.spoon.grams
  draft.state.spoon.grams = 0
  vessel.leaves =
    vessel.leaves === null
      ? { teaId, grams, isSteeping: false, steepedSeconds: 0 }
      : { ...vessel.leaves, grams: vessel.leaves.grams + grams }
  note(draft, `tipped ${grams.toFixed(2)} g of ${teaId} into ${vessel.id}, which now holds ${vessel.leaves.grams.toFixed(2)} g`)
  draft.events.push({ type: 'leavesAdded', vesselId: vessel.id, grams })
}
