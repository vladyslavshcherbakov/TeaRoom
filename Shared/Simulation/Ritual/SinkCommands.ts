import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import type { RunningWaterState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { describeLiquid, note, refuse, type Draft } from './Draft.ts'
import { rulesFor } from './ItemKinds.ts'
import { isInAHand, isKnown, isNotBeingPoured, isNotBurntAway, isTheKeeperAt, isWithinTheKeepersReach, wasRefusedByAnyOf, type Check } from './ItemRefusals.ts'
import { emptyTheHand, locationOfItem, moveItem, tapOf, whereIs } from './Reach.ts'

export function putInTheSink(draft: Draft, command: CommandOfType<'putInTheSink'>): void {
  const itemId = command.itemId
  const tap = tapOf(draft)
  if (tap === null) return refuse(draft, command, 'noTapInThisRoom')
  if (wasRefusedByAnyOf(draft, command, [isKnown(itemId), isNotBurntAway(itemId), isWithinTheKeepersReach(itemId), isInAHand(itemId), isTheKeeperAt(tap.sinkSpot.placeId, 'the sink'), canGoInTheSink(itemId), isTheSinkFree, isNotBeingPoured(itemId)])) return
  const location = locationOfItem(draft, itemId)
  const whereItWas = whereIs(location)
  if (location?.kind === 'inHand') emptyTheHand(draft, location.handIndex)
  moveItem(draft, itemId, { kind: 'onSurface', spot: tap.sinkSpot })
  draft.state.sink.itemIdInside = itemId
  draft.state.sink.hasRunOverTheItemInside = false
  note(draft, `${itemId}, which was ${whereItWas}, put in the sink`)
  draft.events.push({ type: 'putInTheSink', itemId })
  if (draft.state.sink.runningWater === null) return note(draft, `the tap stays closed over ${itemId} until the keeper turns it on`)
  draft.state.sink.runningWater = runningWaterOver(draft, itemId, draft.state.sink.runningWater)
  note(draft, `the running tap now runs onto ${itemId}`)
}

export function turnTheTapOn(draft: Draft, command: CommandOfType<'turnTheTapOn'>): void {
  const tap = tapOf(draft)
  if (tap === null) return refuse(draft, command, 'noTapInThisRoom')
  if (wasRefusedByAnyOf(draft, command, [isTheKeeperAt(tap.sinkSpot.placeId, 'the tap')])) return
  if (draft.state.sink.runningWater !== null) return refuse(draft, command, 'tapAlreadyOn')
  openTheTap(draft, tap)
}

export function turnTheTapOff(draft: Draft, command: CommandOfType<'turnTheTapOff'>): void {
  const tap = tapOf(draft)
  const runningWater = draft.state.sink.runningWater
  if (tap === null) return refuse(draft, command, 'noTapInThisRoom')
  if (wasRefusedByAnyOf(draft, command, [isTheKeeperAt(tap.sinkSpot.placeId, 'the tap')])) return
  if (runningWater === null) return refuse(draft, command, 'tapAlreadyOff')
  draft.state.sink.runningWater = null
  const openSeconds = draft.state.elapsedSeconds - runningWater.openedAtSeconds
  note(
    draft,
    `tap closed over ${draft.state.sink.itemIdInside ?? 'the empty sink'}: ${runningWater.filledMl.toFixed(1)} ml went in, ${runningWater.drainedMl.toFixed(1)} ml down the drain; ` +
      `open for ${openSeconds.toFixed(1)} s, ${runningWater.drainedSinceOpenedMl.toFixed(1)} ml down the drain since it opened, ${runningWater.hasRunOntoAnItem ? 'having run onto an item' : 'into the empty sink all along'}` +
      describeWhatStandsInTheSink(draft),
  )
  draft.events.push({ type: 'tapTurnedOff', openSeconds, drainedMl: runningWater.drainedSinceOpenedMl, hasRunOntoAnItem: runningWater.hasRunOntoAnItem })
}

export function liftOutOfTheSink(draft: Draft, itemId: string): void {
  const sink = draft.state.sink
  if (sink.itemIdInside !== itemId) return
  sink.itemIdInside = null
  rulesFor(draft.state, itemId)?.liftOutOfTheSink(draft, itemId)
  sink.hasRunOverTheItemInside = false
  const runningWater = sink.runningWater
  if (runningWater === null) return note(draft, `${itemId} lifted out of the sink, the tap is closed`)
  note(draft, `${itemId} lifted out of the sink after ${runningWater.filledMl.toFixed(1)} ml went in, the tap keeps running into the empty sink`)
  sink.runningWater = runningWaterOver(draft, null, runningWater)
}

function openTheTap(draft: Draft, tap: TapDefinition): void {
  const itemId = draft.state.sink.itemIdInside
  draft.state.sink.runningWater = runningWaterOver(draft, itemId, null)
  note(
    draft,
    `tap opened over ${itemId ?? 'the empty sink'}, water at ${tap.waterTemperatureC} °C, ${tap.flowMlPerSecond} ml/s` +
      (draft.state.sink.runningWater.isRunningOverTheLid ? ', running over the closed lid into the drain' : ''),
  )
  draft.events.push({ type: 'tapTurnedOn' })
}

function runningWaterOver(draft: Draft, itemId: string | null, runningBefore: RunningWaterState | null): RunningWaterState {
  return {
    openedAtSeconds: runningBefore?.openedAtSeconds ?? draft.state.elapsedSeconds,
    drainedSinceOpenedMl: runningBefore?.drainedSinceOpenedMl ?? 0,
    filledMl: 0,
    drainedMl: 0,
    hasOverflowed: false,
    isRunningOverTheLid: itemId !== null && rulesFor(draft.state, itemId)?.isClosedAgainstTheTap(draft, itemId) === true,
    hasRunOntoAnItem: (runningBefore?.hasRunOntoAnItem ?? false) || itemId !== null,
  }
}

function describeWhatStandsInTheSink(draft: Draft): string {
  const itemId = draft.state.sink.itemIdInside
  const vessel = itemId === null ? undefined : draft.state.vessels[itemId]
  return vessel === undefined ? '' : `; ${describeLiquid(vessel)}`
}

function canGoInTheSink(itemId: string): Check {
  return (draft) => (rulesFor(draft.state, itemId)?.runTheTapOnto === null ? { reason: 'cannotGoInTheSink', values: `${itemId} is kept out of the sink` } : null)
}

const isTheSinkFree: Check = (draft) => {
  const occupant = draft.state.sink.itemIdInside
  return occupant === null ? null : { reason: 'sinkOccupied', values: `${occupant} is in it` }
}
