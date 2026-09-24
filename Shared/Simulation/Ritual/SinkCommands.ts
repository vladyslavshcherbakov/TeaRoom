import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import type { RunningWaterState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { isClosedAgainstFilling, isInvolvedInPour, note, refuse, type Draft } from './Draft.ts'
import { caddyItemId, isKeeperAt, locationOfItem, moveItem, spoonItemId, tapOf, whereIs, whereTheKeeperStands } from './Reach.ts'

const itemsKeptOutOfTheSink: ReadonlySet<string> = new Set([caddyItemId, spoonItemId])

export function putInTheSink(draft: Draft, command: CommandOfType<'putInTheSink'>): void {
  const tap = tapOf(draft)
  if (tap === null) return refuse(draft, command, 'noTapInThisRoom')
  const location = locationOfItem(draft, command.itemId)
  if (location === undefined) return refuse(draft, command, 'unknownItem')
  if (itemsKeptOutOfTheSink.has(command.itemId)) return refuse(draft, command, 'cannotGoInTheSink')
  if (location.kind !== 'inHand') return refuse(draft, command, 'notInHand', `${command.itemId} is ${whereIs(location)}`)
  if (!isKeeperAt(draft, tap.sinkSpot.placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the sink is at the ${tap.sinkSpot.placeId}`)
  const occupant = draft.state.sink.itemIdInside
  if (occupant !== null) return refuse(draft, command, 'sinkOccupied', `${occupant} is in it`)
  if (isInvolvedInPour(draft, command.itemId)) return refuse(draft, command, 'vesselIsBeingPoured')
  draft.state.keeper.hands[location.handIndex] = null
  moveItem(draft, command.itemId, { kind: 'onSurface', spot: tap.sinkSpot })
  draft.state.sink.itemIdInside = command.itemId
  note(draft, `${command.itemId} put in the sink from hand ${location.handIndex}`)
  draft.events.push({ type: 'putInTheSink', itemId: command.itemId })
  if (draft.state.sink.runningWater === null) return openTheTap(draft, tap)
  draft.state.sink.runningWater = runningWaterOver(draft, command.itemId)
  note(draft, `the running tap now runs onto ${command.itemId}`)
}

export function turnTheTapOn(draft: Draft, command: CommandOfType<'turnTheTapOn'>): void {
  const tap = tapOf(draft)
  if (tap === null) return refuse(draft, command, 'noTapInThisRoom')
  if (draft.state.sink.runningWater !== null) return refuse(draft, command, 'tapAlreadyOn')
  if (!isKeeperAt(draft, tap.sinkSpot.placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the tap is at the ${tap.sinkSpot.placeId}`)
  openTheTap(draft, tap)
}

export function turnTheTapOff(draft: Draft, command: CommandOfType<'turnTheTapOff'>): void {
  const tap = tapOf(draft)
  const runningWater = draft.state.sink.runningWater
  if (tap === null) return refuse(draft, command, 'noTapInThisRoom')
  if (runningWater === null) return refuse(draft, command, 'tapAlreadyOff')
  if (!isKeeperAt(draft, tap.sinkSpot.placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the tap is at the ${tap.sinkSpot.placeId}`)
  draft.state.sink.runningWater = null
  note(draft, `tap closed over ${draft.state.sink.itemIdInside ?? 'the empty sink'}: ${runningWater.filledMl.toFixed(1)} ml went in, ${runningWater.drainedMl.toFixed(1)} ml down the drain`)
  draft.events.push({ type: 'tapTurnedOff' })
}

export function liftOutOfTheSink(draft: Draft, itemId: string): void {
  const sink = draft.state.sink
  if (sink.itemIdInside !== itemId) return
  sink.itemIdInside = null
  const runningWater = sink.runningWater
  if (runningWater === null) return note(draft, `${itemId} lifted out of the sink, the tap is closed`)
  note(draft, `${itemId} lifted out of the sink after ${runningWater.filledMl.toFixed(1)} ml went in, the tap keeps running into the empty sink`)
  sink.runningWater = runningWaterOver(draft, null)
}

function openTheTap(draft: Draft, tap: TapDefinition): void {
  const itemId = draft.state.sink.itemIdInside
  draft.state.sink.runningWater = runningWaterOver(draft, itemId)
  note(
    draft,
    `tap opened over ${itemId ?? 'the empty sink'}, water at ${tap.waterTemperatureC} °C, ${tap.flowMlPerSecond} ml/s` +
      (draft.state.sink.runningWater.isRunningOverTheLid ? ', running over the closed lid into the drain' : ''),
  )
  draft.events.push({ type: 'tapTurnedOn' })
}

function runningWaterOver(draft: Draft, itemId: string | null): RunningWaterState {
  const vessel = itemId === null ? undefined : draft.state.vessels[itemId]
  return { filledMl: 0, drainedMl: 0, hasOverflowed: false, isRunningOverTheLid: vessel !== undefined && isClosedAgainstFilling(draft, vessel) }
}
