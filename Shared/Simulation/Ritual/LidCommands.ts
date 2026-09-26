import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { isCoolEnoughToHold, isWithinTheKeepersReach, wasRefusedByAnyOf, type Check } from './ItemRefusals.ts'

export function moveVesselLid(
  draft: Draft,
  command: CommandOfType<'openVesselLid'> | CommandOfType<'closeVesselLid'>,
): void {
  const vessel = draft.state.vessels[command.vesselId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel', `the room has no vessel ${command.vesselId}`)
  if (wasRefusedByAnyOf(draft, command, [isWithinTheKeepersReach(vessel.id), hasALid(vessel), isCoolEnoughToHold(vessel.id)])) return
  const shouldOpen = command.type === 'openVesselLid'
  if (vessel.isLidOpen === shouldOpen) return refuse(draft, command, shouldOpen ? 'lidAlreadyOpen' : 'lidAlreadyClosed')
  vessel.isLidOpen = shouldOpen
  note(draft, `${vessel.id} lid ${shouldOpen ? 'opened' : 'closed'}`)
  draft.events.push({ type: shouldOpen ? 'vesselLidOpened' : 'vesselLidClosed', vesselId: vessel.id })
}

export function closeTheLidAsItIsLifted(draft: Draft, itemId: string, how: string): void {
  const vessel = draft.state.vessels[itemId]
  if (vessel === undefined || !vessel.isLidOpen) return
  vessel.isLidOpen = false
  note(draft, `${vessel.id} lid closed as ${how}`)
  draft.events.push({ type: 'vesselLidClosed', vesselId: vessel.id })
}

function hasALid(vessel: VesselState): Check {
  return (draft) => (vesselDefinitionOf(draft, vessel).lid === null ? { reason: 'vesselHasNoLid', values: `${vessel.id} has no lid` } : null)
}
