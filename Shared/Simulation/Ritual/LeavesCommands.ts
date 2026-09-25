import type { CommandOfType } from './Command.ts'
import { isClosedAgainstFilling, note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { isWithinReach, whereIs } from './Reach.ts'

export function scoopTea(draft: Draft, command: CommandOfType<'scoopTea'>): void {
  const { caddy, spoon } = draft.state
  if (spoon.location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `the spoon is ${whereIs(spoon.location)}`)
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
  if (draft.state.spoon.location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `the spoon is ${whereIs(draft.state.spoon.location)}`)
  if (!isWithinReach(draft, vessel.location)) return refuse(draft, command, 'outOfReach', `${vessel.id} is ${whereIs(vessel.location)}`)
  if (!vesselDefinitionOf(draft, vessel).canHoldLeaves) return refuse(draft, command, 'cannotHoldLeaves')
  if (isClosedAgainstFilling(draft, vessel)) return refuse(draft, command, 'lidClosed', `spoon keeps ${draft.state.spoon.grams.toFixed(2)} g`)
  const grams = draft.state.spoon.grams
  draft.state.spoon.grams = 0
  vessel.leaves =
    vessel.leaves === null
      ? { teaId, grams, isSteeping: false, isStirredByTheBoil: false, steepedSeconds: 0 }
      : { ...vessel.leaves, grams: vessel.leaves.grams + grams }
  note(draft, `tipped ${grams.toFixed(2)} g of ${teaId} into ${vessel.id}, which now holds ${vessel.leaves.grams.toFixed(2)} g`)
  draft.events.push({ type: 'leavesAdded', vesselId: vessel.id, grams })
}
