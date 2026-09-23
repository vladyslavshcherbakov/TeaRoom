import type { CommandOfType } from './Command.ts'
import { refuse, vesselDefinitionOf, type Draft } from './Draft.ts'

export function scoopTea(draft: Draft, command: CommandOfType<'scoopTea'>): void {
  const { caddy, spoon } = draft.state
  if (!caddy.isOpen) return refuse(draft, command, 'lidClosed')
  if (caddy.grams <= 0) return refuse(draft, command, 'caddyIsEmpty')
  if (spoon.grams >= spoon.capacityGrams) return refuse(draft, command, 'spoonIsFull')
  const depth = Math.min(1, Math.max(0, command.depth))
  const grams = Math.min(spoon.capacityGrams * depth, spoon.capacityGrams - spoon.grams, caddy.grams)
  caddy.grams -= grams
  spoon.grams += grams
  draft.events.push({ type: 'teaScooped', grams })
}

export function tipSpoonInto(draft: Draft, command: CommandOfType<'tipSpoonInto'>): void {
  const vessel = draft.state.vessels[command.vesselId]
  const teaId = draft.state.caddy.teaId
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  if (draft.state.spoon.grams <= 0 || teaId === null) return refuse(draft, command, 'spoonIsEmpty')
  const definition = vesselDefinitionOf(draft, vessel)
  if (!definition.canHoldLeaves) return refuse(draft, command, 'cannotHoldLeaves')
  if (definition.lid?.mustBeOpenToFill === true && !vessel.isLidOpen) return refuse(draft, command, 'lidClosed')
  const grams = draft.state.spoon.grams
  draft.state.spoon.grams = 0
  vessel.leaves =
    vessel.leaves === null
      ? { teaId, grams, isSteeping: false, steepedSeconds: 0 }
      : { ...vessel.leaves, grams: vessel.leaves.grams + grams }
  draft.events.push({ type: 'leavesAdded', vesselId: vessel.id, grams })
}
