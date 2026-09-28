import { isEmpty } from '../Chemistry/Liquid.ts'
import type { PourState, VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { describeLiquid, type Draft } from './Draft.ts'
import { note, noteDetail } from '../../Engine/Draft.ts'
import { commandRule, commandRuleOnASubject, found, refuse, refusedWith, type Found } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import type { RefusalReason } from './TeaEvent.ts'
import { isOpenForFilling, isOpenForPouring, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'
import { whereThePlayerStands } from './Reach.ts'
import { wetMlOnEveryPlace } from './Puddles.ts'
import { percent } from '../../Engine/Percent.ts'
import { itemIdOnTheHeater } from '../State/WhereItemsAre.ts'

type SourceAndTarget = { readonly source: VesselState; readonly target: VesselState | null }

export const startPouringRule: TeaCommandEntry<'startPouring'> = commandRuleOnASubject({
  find: foundSourceAndTarget,
  checks: ({ source, target }) => checksToPour(source, target),
  carryOut: startPouring,
})

export const adjustPourRule: TeaCommandEntry<'adjustPour'> = commandRule({ isLoggedOnReceipt: false, carryOut: adjustPour })

export const stopPouringRule: TeaCommandEntry<'stopPouring'> = commandRule({ carryOut: stopPouring })

export function lidsClosedAgainstAPour(draft: Draft, sourceId: string, targetId: string | null): readonly string[] {
  const isTheSourceClosed = isOpenForPouring(sourceId)(draft) !== null
  const isTheTargetClosed = targetId !== null && isOpenForFilling(targetId)(draft) !== null
  return [...(isTheSourceClosed ? [sourceId] : []), ...(isTheTargetClosed && targetId !== null ? [targetId] : [])]
}

export function finishPour(draft: Draft): void {
  const pour = draft.state.pour
  if (pour === null) return
  draft.state.pour = null
  note(
    draft,
    `pour from ${pour.sourceId} into ${pour.targetId ?? 'the table'} finished, tilted at most ${pour.highestTiltDegrees.toFixed(1)}°: ` +
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

function foundSourceAndTarget(draft: Draft, command: CommandOfType<'startPouring'>): Found<SourceAndTarget, RefusalReason> {
  const source = draft.state.vessels[command.sourceId]
  const target = command.targetId === null ? null : draft.state.vessels[command.targetId]
  if (source === undefined || target === undefined) return refusedWith('unknownVessel', `the room has no vessel ${source === undefined ? command.sourceId : command.targetId}`)
  return found({ source, target })
}

function startPouring(draft: Draft, { source, target }: SourceAndTarget): void {
  draft.state.pour = {
    sourceId: source.id,
    targetId: target?.id ?? null,
    tiltDegrees: 0,
    highestTiltDegrees: 0,
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

function adjustPour(draft: Draft, command: CommandOfType<'adjustPour'>): void {
  const pour = draft.state.pour
  if (pour === null) return refuse(draft, command, 'notPouring')
  const whereItSpilledBefore = whereTheStreamSpills(pour)
  pour.tiltDegrees = command.tiltDegrees
  pour.highestTiltDegrees = Math.max(pour.highestTiltDegrees, command.tiltDegrees)
  pour.streamOnTargetFraction = command.streamOnTargetFraction
  pour.missedStreamLandsAt = command.missedStreamLandsAt
  if (whereTheStreamSpills(pour) === whereItSpilledBefore) return
  const landing = command.missedStreamLandsAt
  const rest = landing === null ? ', the rest falls where no top is and is lost' : `, the rest falls on the ${landing.placeId} at (${landing.x.toFixed(2)}, ${landing.z.toFixed(2)})`
  noteDetail(draft, `pour tilted to ${command.tiltDegrees.toFixed(1)}°, ${percent(command.streamOnTargetFraction)} on target${isTheWholeStreamOnTarget(pour) ? '' : rest}`)
}

function stopPouring(draft: Draft, command: CommandOfType<'stopPouring'>): void {
  if (draft.state.pour === null) return refuse(draft, command, 'notPouring')
  finishPour(draft)
}

function checksToPour(source: VesselState, target: VesselState | null): readonly Check[] {
  if (target === null) {
    return [isWithinThePlayersReach(source.id), isThePlayerStandingAtAPlace, isNoOtherPourRunning, isNotOnTheHeater(source.id), hasSomethingToPour(source), isOpenForPouring(source.id)]
  }
  return [
    isWithinThePlayersReach(source.id),
    isWithinThePlayersReach(target.id),
    isNoOtherPourRunning,
    isNotTheSource(source, target),
    isNotOnTheHeater(source.id),
    hasSomethingToPour(source),
    isOpenForPouring(source.id),
    isOpenForFilling(target.id),
  ]
}

const isThePlayerStandingAtAPlace: Check = (draft) => (draft.state.player.placeId === null ? { reason: 'outOfReach', values: `${whereThePlayerStands(draft)}, so no surface is below the stream` } : null)

const isNoOtherPourRunning: Check = (draft) => {
  const pour = draft.state.pour
  return pour === null ? null : { reason: 'alreadyPouring', values: `pouring ${pour.sourceId} into ${pour.targetId ?? 'the table'}` }
}

function isNotTheSource(source: VesselState, target: VesselState): Check {
  return () => (source.id === target.id ? { reason: 'cannotPourIntoItself', values: `${source.id} is both the source and the target` } : null)
}

function isNotOnTheHeater(vesselId: string): Check {
  return (draft) => (itemIdOnTheHeater(draft.state) === vesselId ? { reason: 'vesselIsOnTheHeater', values: `${vesselId} stands on the heater` } : null)
}

function hasSomethingToPour(source: VesselState): Check {
  return () => (isEmpty(source.liquid) ? { reason: 'sourceIsEmpty', values: describeLiquid(source) } : null)
}

function describeVesselById(draft: Draft, vesselId: string): string {
  const vessel = draft.state.vessels[vesselId]
  return vessel === undefined ? `${vesselId}, which is gone` : describeLiquid(vessel)
}

function whereTheStreamSpills(pour: PourState): string | null {
  if (isTheWholeStreamOnTarget(pour)) return null
  return pour.missedStreamLandsAt?.placeId ?? 'around the target'
}

function isTheWholeStreamOnTarget(pour: PourState): boolean {
  return pour.streamOnTargetFraction >= 1
}
