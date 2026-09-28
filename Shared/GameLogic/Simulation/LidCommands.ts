import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { vesselDefinitionOf, type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRuleOnASubject, refuse } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import { foundVessel, isCoolEnoughToHold, isNotBeingPoured, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'

export const openVesselLidRule: TeaCommandEntry<'openVesselLid'> = commandRuleOnASubject({
  find: (draft, command) => foundVessel(draft, command.vesselId),
  checks: (vessel) => [isWithinThePlayersReach(vessel.id), hasALid(vessel), isCoolEnoughToHold(vessel.id)],
  carryOut: (draft, vessel, command) => moveTheLid(draft, vessel, command, true),
})

export const closeVesselLidRule: TeaCommandEntry<'closeVesselLid'> = commandRuleOnASubject({
  find: (draft, command) => foundVessel(draft, command.vesselId),
  checks: (vessel) => [isWithinThePlayersReach(vessel.id), hasALid(vessel), isNotBeingPoured(vessel.id), isCoolEnoughToHold(vessel.id)],
  carryOut: (draft, vessel, command) => moveTheLid(draft, vessel, command, false),
})

function moveTheLid(draft: Draft, vessel: VesselState, command: CommandOfType<'openVesselLid' | 'closeVesselLid'>, shouldOpen: boolean): void {
  if (vessel.isLidOpen === shouldOpen) return refuse(draft, command, shouldOpen ? 'lidAlreadyOpen' : 'lidAlreadyClosed')
  vessel.isLidOpen = shouldOpen
  note(draft, `${vessel.id} lid ${shouldOpen ? 'opened' : 'closed'}`)
  draft.events.push({ type: shouldOpen ? 'vesselLidOpened' : 'vesselLidClosed', vesselId: vessel.id })
}

function hasALid(vessel: VesselState): Check {
  return (draft) => (vesselDefinitionOf(draft, vessel).lid === null ? { reason: 'vesselHasNoLid', values: `${vessel.id} has no lid` } : null)
}
