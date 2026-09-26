import { isEmpty } from '../Physics/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { describeLiquid, note, noteDetail, refuse, type Draft } from './Draft.ts'
import { isOpenForFilling, isOpenForPouring, isWithinTheKeepersReach, wasRefusedByAnyOf, type Check } from './ItemRefusals.ts'
import { whereTheKeeperStands } from './Reach.ts'
import { wetMlOnEveryPlace } from './Puddles.ts'
import { percent } from './Percent.ts'

export function startPouring(draft: Draft, command: CommandOfType<'startPouring'>): void {
  const source = draft.state.vessels[command.sourceId]
  const target = command.targetId === null ? null : draft.state.vessels[command.targetId]
  if (source === undefined || target === undefined) return refuse(draft, command, 'unknownVessel', `the room has no vessel ${source === undefined ? command.sourceId : command.targetId}`)
  if (wasRefusedByAnyOf(draft, command, checksToPour(source, target))) return
  draft.state.pour = {
    sourceId: source.id,
    targetId: target?.id ?? null,
    tiltDegrees: 0,
    streamOnTargetFraction: 1,
    missedStreamLandsAt: null,
    pouredMl: 0,
    spilledMl: 0,
    hasOverflowed: false,
    hasRunDry: false,
  }
  note(draft, `pour started from ${describeLiquid(source)} into ${target === null ? 'the table' : describeLiquid(target)}`)
  draft.events.push({ type: 'pourStarted', sourceId: source.id, targetId: target?.id ?? null })
}

export function adjustPour(draft: Draft, command: CommandOfType<'adjustPour'>): void {
  if (draft.state.pour === null) return refuse(draft, command, 'notPouring')
  draft.state.pour.tiltDegrees = command.tiltDegrees
  draft.state.pour.streamOnTargetFraction = command.streamOnTargetFraction
  draft.state.pour.missedStreamLandsAt = command.missedStreamLandsAt
  const landing = command.missedStreamLandsAt
  noteDetail(draft, `pour tilted to ${command.tiltDegrees.toFixed(1)}°, ${percent(command.streamOnTargetFraction)} on target${landing === null ? '' : `, the rest falls on the ${landing.placeId} at (${landing.x.toFixed(2)}, ${landing.z.toFixed(2)})`}`)
}

export function stopPouring(draft: Draft, command: CommandOfType<'stopPouring'>): void {
  if (draft.state.pour === null) return refuse(draft, command, 'notPouring')
  finishPour(draft)
}

export function finishPour(draft: Draft): void {
  const pour = draft.state.pour
  if (pour === null) return
  draft.state.pour = null
  note(
    draft,
    `pour from ${pour.sourceId} into ${pour.targetId ?? 'the table'} finished: ` +
      `${pour.pouredMl.toFixed(1)} ml landed, ${pour.spilledMl.toFixed(1)} ml spilled, ${wetMlOnEveryPlace(draft.state).toFixed(1)} ml wet on every place; ` +
      `now ${describeVesselById(draft, pour.sourceId)}${pour.targetId === null ? '' : ` and ${describeVesselById(draft, pour.targetId)}`}`,
  )
  draft.events.push({
    type: 'pourFinished',
    sourceId: pour.sourceId,
    targetId: pour.targetId,
    pouredMl: pour.pouredMl,
    spilledMl: pour.spilledMl,
  })
}

function checksToPour(source: VesselState, target: VesselState | null): readonly Check[] {
  if (target === null) {
    return [isWithinTheKeepersReach(source.id), isTheKeeperStandingAtAPlace, isNoOtherPourRunning, isNotInTheSink(source.id), isNotOnTheHeater(source.id), hasSomethingToPour(source), isOpenForPouring(source.id)]
  }
  return [
    isWithinTheKeepersReach(source.id),
    isWithinTheKeepersReach(target.id),
    isNoOtherPourRunning,
    isNotTheSource(source, target),
    isNotInTheSink(source.id),
    isNotInTheSink(target.id),
    isNotOnTheHeater(source.id),
    hasSomethingToPour(source),
    isOpenForPouring(source.id),
    isOpenForFilling(target.id),
  ]
}

const isTheKeeperStandingAtAPlace: Check = (draft) => (draft.state.keeper.placeId === null ? { reason: 'outOfReach', values: `${whereTheKeeperStands(draft)}, so no surface is below the stream` } : null)

const isNoOtherPourRunning: Check = (draft) => {
  const pour = draft.state.pour
  return pour === null ? null : { reason: 'alreadyPouring', values: `pouring ${pour.sourceId} into ${pour.targetId ?? 'the table'}` }
}

function isNotTheSource(source: VesselState, target: VesselState): Check {
  return () => (source.id === target.id ? { reason: 'cannotPourIntoItself', values: `${source.id} is both the source and the target` } : null)
}

function isNotInTheSink(vesselId: string): Check {
  return (draft) => (draft.state.sink.itemIdInside === vesselId ? { reason: 'vesselIsInTheSink', values: `${vesselId} stands in the sink` } : null)
}

function isNotOnTheHeater(vesselId: string): Check {
  return (draft) => (draft.state.heater.itemIdOnTop === vesselId ? { reason: 'vesselIsOnTheHeater', values: `${vesselId} stands on the heater` } : null)
}

function hasSomethingToPour(source: VesselState): Check {
  return () => (isEmpty(source.liquid) ? { reason: 'sourceIsEmpty', values: describeLiquid(source) } : null)
}

function describeVesselById(draft: Draft, vesselId: string): string {
  const vessel = draft.state.vessels[vesselId]
  return vessel === undefined ? `${vesselId}, which is gone` : describeLiquid(vessel)
}
