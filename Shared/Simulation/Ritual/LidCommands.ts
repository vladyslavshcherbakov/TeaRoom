import type { CommandOfType } from './Command.ts'
import { refuse, vesselDefinitionOf, type Draft } from './Draft.ts'

export function moveVesselLid(
  draft: Draft,
  command: CommandOfType<'openVesselLid'> | CommandOfType<'closeVesselLid'>,
): void {
  const vessel = draft.state.vessels[command.vesselId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  if (vesselDefinitionOf(draft, vessel).lid === null) return refuse(draft, command, 'vesselHasNoLid')
  const shouldOpen = command.type === 'openVesselLid'
  if (vessel.isLidOpen === shouldOpen) return refuse(draft, command, shouldOpen ? 'lidAlreadyOpen' : 'lidAlreadyClosed')
  vessel.isLidOpen = shouldOpen
  draft.events.push({ type: shouldOpen ? 'vesselLidOpened' : 'vesselLidClosed', vesselId: vessel.id })
}

export function moveCaddyLid(draft: Draft, command: CommandOfType<'openCaddy'> | CommandOfType<'closeCaddy'>): void {
  const shouldOpen = command.type === 'openCaddy'
  if (draft.state.caddy.isOpen === shouldOpen) {
    return refuse(draft, command, shouldOpen ? 'lidAlreadyOpen' : 'lidAlreadyClosed')
  }
  draft.state.caddy.isOpen = shouldOpen
  draft.events.push({ type: shouldOpen ? 'caddyOpened' : 'caddyClosed' })
}
