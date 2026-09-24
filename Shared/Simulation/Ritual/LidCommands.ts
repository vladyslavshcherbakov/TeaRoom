import type { CommandOfType } from './Command.ts'
import { note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { caddyItemId, isWithinReach, whereIs, whereTheKeeperStands } from './Reach.ts'

export function moveVesselLid(
  draft: Draft,
  command: CommandOfType<'openVesselLid'> | CommandOfType<'closeVesselLid'>,
): void {
  const vessel = draft.state.vessels[command.vesselId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  if (vesselDefinitionOf(draft, vessel).lid === null) return refuse(draft, command, 'vesselHasNoLid')
  if (!isWithinReach(draft, vessel.location)) return refuse(draft, command, 'outOfReach', `${vessel.id} is ${whereIs(vessel.location)}, ${whereTheKeeperStands(draft)}`)
  const shouldOpen = command.type === 'openVesselLid'
  if (vessel.isLidOpen === shouldOpen) return refuse(draft, command, shouldOpen ? 'lidAlreadyOpen' : 'lidAlreadyClosed')
  vessel.isLidOpen = shouldOpen
  note(draft, `${vessel.id} lid ${shouldOpen ? 'opened' : 'closed'}`)
  draft.events.push({ type: shouldOpen ? 'vesselLidOpened' : 'vesselLidClosed', vesselId: vessel.id })
}

export function moveCaddyLid(draft: Draft, command: CommandOfType<'openCaddy'> | CommandOfType<'closeCaddy'>): void {
  const shouldOpen = command.type === 'openCaddy'
  if (!isWithinReach(draft, draft.state.caddy.location)) {
    return refuse(draft, command, 'outOfReach', `the caddy is ${whereIs(draft.state.caddy.location)}, ${whereTheKeeperStands(draft)}`)
  }
  if (draft.state.caddy.isOpen === shouldOpen) {
    return refuse(draft, command, shouldOpen ? 'lidAlreadyOpen' : 'lidAlreadyClosed')
  }
  draft.state.caddy.isOpen = shouldOpen
  note(draft, `caddy ${shouldOpen ? 'opened' : 'closed'} with ${draft.state.caddy.grams.toFixed(1)} g inside`)
  draft.events.push({ type: shouldOpen ? 'caddyOpened' : 'caddyClosed' })
}

export function closeTheLidAsItIsLifted(draft: Draft, itemId: string, how: string): void {
  if (itemId === caddyItemId && draft.state.caddy.isOpen) {
    draft.state.caddy.isOpen = false
    note(draft, `the caddy lid closed as ${how}`)
    draft.events.push({ type: 'caddyClosed' })
    return
  }
  const vessel = draft.state.vessels[itemId]
  if (vessel === undefined || !vessel.isLidOpen) return
  vessel.isLidOpen = false
  note(draft, `${vessel.id} lid closed as ${how}`)
  draft.events.push({ type: 'vesselLidClosed', vesselId: vessel.id })
}
