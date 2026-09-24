import { definitionIn } from '../Definitions/Catalog.ts'
import type { CommandOfType } from './Command.ts'
import { describeLiquid, isInvolvedInPour, note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import type { VesselState } from '../State/SessionState.ts'
import { isKeeperAt, whereIs, whereTheKeeperStands } from './Reach.ts'

export function startFillingFromTap(draft: Draft, command: CommandOfType<'startFillingFromTap'>): void {
  const tap = definitionIn(draft.catalog, 'rooms', draft.state.roomId).tap
  const vessel = draft.state.vessels[command.vesselId]
  if (tap === null) return refuse(draft, command, 'noTapInThisRoom')
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  const filling = draft.state.filling
  if (filling !== null) return refuse(draft, command, 'alreadyFilling', `${filling.vesselId} is under the tap`)
  if (!isKeeperAt(draft, tap.placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the tap is at the ${tap.placeId}`)
  if (vessel.location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `${vessel.id} is ${whereIs(vessel.location)}`)
  if (isInvolvedInPour(draft, vessel.id)) return refuse(draft, command, 'vesselIsBeingPoured')
  const isRunningOverTheLid = isClosedAgainstFilling(draft, vessel)
  draft.state.filling = { vesselId: vessel.id, filledMl: 0, overflowedMl: 0, hasOverflowed: false, isRunningOverTheLid }
  note(
    draft,
    `tap opened over ${describeLiquid(vessel)}, water at ${tap.waterTemperatureC} °C, ${tap.flowMlPerSecond} ml/s` +
      (isRunningOverTheLid ? ', running over the closed lid into the sink' : ''),
  )
  draft.events.push({ type: 'fillingStarted', vesselId: vessel.id })
}

export function stopFillingFromTap(draft: Draft, command: CommandOfType<'stopFillingFromTap'>): void {
  if (draft.state.filling === null) return refuse(draft, command, 'notFilling')
  finishFilling(draft, 'the tap was closed')
}

export function isClosedAgainstFilling(draft: Draft, vessel: VesselState): boolean {
  return vesselDefinitionOf(draft, vessel).lid?.mustBeOpenToFill === true && !vessel.isLidOpen
}

export function finishFilling(draft: Draft, reason: string): void {
  const filling = draft.state.filling
  if (filling === null) return
  draft.state.filling = null
  const vessel = draft.state.vessels[filling.vesselId]
  note(
    draft,
    `filling ${filling.vesselId} stopped because ${reason}: ${filling.filledMl.toFixed(1)} ml in, ` +
      `${filling.overflowedMl.toFixed(1)} ml into the sink, now ${vessel === undefined ? 'gone' : describeLiquid(vessel)}`,
  )
  draft.events.push({ type: 'fillingFinished', vesselId: filling.vesselId, filledMl: filling.filledMl, overflowedMl: filling.overflowedMl })
}
