import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { isCoolEnoughToHold, isWithinTheKeepersReach, wasRefusedByAnyOf } from './ItemRefusals.ts'

export function moveVesselLid(
  draft: Draft,
  command: CommandOfType<'openVesselLid'> | CommandOfType<'closeVesselLid'>,
): void {
  const vessel = draft.state.vessels[command.vesselId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  if (vesselDefinitionOf(draft, vessel).lid === null) return refuse(draft, command, 'vesselHasNoLid')
  if (wasRefusedByAnyOf(draft, command, [isWithinTheKeepersReach(vessel.id), isCoolEnoughToHold(vessel.id)])) return
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
