import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { isCoolEnoughToHold, isNotBeingPoured, isWithinTheKeepersReach, wasRefusedByAnyOf, type Check } from './ItemRefusals.ts'

export function moveVesselLid(
  draft: Draft,
  command: CommandOfType<'openVesselLid'> | CommandOfType<'closeVesselLid'>,
): void {
  const vessel = draft.state.vessels[command.vesselId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel', `the room has no vessel ${command.vesselId}`)
  const shouldOpen = command.type === 'openVesselLid'
  const checksBeforeClosing = shouldOpen ? [] : [isNotBeingPoured(vessel.id)]
  if (wasRefusedByAnyOf(draft, command, [isWithinTheKeepersReach(vessel.id), hasALid(vessel), ...checksBeforeClosing, isCoolEnoughToHold(vessel.id)])) return
  if (vessel.isLidOpen === shouldOpen) return refuse(draft, command, shouldOpen ? 'lidAlreadyOpen' : 'lidAlreadyClosed')
  vessel.isLidOpen = shouldOpen
  note(draft, `${vessel.id} lid ${shouldOpen ? 'opened' : 'closed'}`)
  draft.events.push({ type: shouldOpen ? 'vesselLidOpened' : 'vesselLidClosed', vesselId: vessel.id })
}

function hasALid(vessel: VesselState): Check {
  return (draft) => (vesselDefinitionOf(draft, vessel).lid === null ? { reason: 'vesselHasNoLid', values: `${vessel.id} has no lid` } : null)
}
