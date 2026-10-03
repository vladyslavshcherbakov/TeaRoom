import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import { itemIdInTheSink } from '../State/WhereItemsAre.ts'
import { describeLiquid, type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRuleOnASubject, found, refuse, refusedWith, type Found } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import type { RefusalReason } from './TeaEvent.ts'
import type { CommandOfType } from './Command.ts'
import { rulesFor } from './ItemKinds.ts'
import { isInAHand, isKnown, isNotBeingPoured, isNotBurntAway, isThePlayerAt, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'
import { moveItem } from './MoveItem.ts'
import { tapOf, whereTheItemIs } from './Reach.ts'
import { runningWaterOver } from './RunningWater.ts'
import type { TapUse } from '../State/SessionState.ts'

const defaultTapUse: TapUse = 'fill'

export const putInTheSinkRule: TeaCommandEntry<'putInTheSink'> = commandRuleOnASubject({
  find: foundTap,
  checks: (tap, { itemId }) => [isKnown(itemId), isNotBurntAway(itemId), isWithinThePlayersReach(itemId), isInAHand(itemId), isThePlayerAt(tap.sinkSpot.placeId, 'the sink'), canGoInTheSink(itemId), isTheSinkFree, isNotBeingPoured(itemId)],
  carryOut: putInTheSink,
})

export const turnTheTapOnRule: TeaCommandEntry<'turnTheTapOn'> = commandRuleOnASubject({
  find: foundTap,
  checks: (tap) => [isThePlayerAt(tap.sinkSpot.placeId, 'the tap')],
  carryOut: turnTheTapOn,
})

export const turnTheTapOffRule: TeaCommandEntry<'turnTheTapOff'> = commandRuleOnASubject({
  find: foundTap,
  checks: (tap) => [isThePlayerAt(tap.sinkSpot.placeId, 'the tap')],
  carryOut: turnTheTapOff,
})

function putInTheSink(draft: Draft, tap: TapDefinition, command: CommandOfType<'putInTheSink'>): void {
  const itemId = command.itemId
  const whereItWas = whereTheItemIs(draft.state, itemId)
  moveItem(draft, itemId, { kind: 'inTheSink', spot: tap.sinkSpot })
  draft.state.sink.hasRinsedTheItemInside = false
  note(draft, `${itemId}, which was ${whereItWas}, put in the sink`)
  draft.events.push({ type: 'putInTheSink', itemId })
  const runningWater = draft.state.sink.runningWater
  if (runningWater === null) return note(draft, `the tap stays closed over ${itemId} until the player turns it on`)
  const use = command.use ?? runningWater.use
  draft.state.sink.runningWater = runningWaterOver(draft, itemId, isClosedAgainstTheTap(draft, itemId), use, runningWater)
  note(draft, `the running tap now runs onto ${itemId} to ${use} it`)
}

function turnTheTapOn(draft: Draft, tap: TapDefinition, command: CommandOfType<'turnTheTapOn'>): void {
  if (draft.state.sink.runningWater !== null) return refuse(draft, command, 'tapAlreadyOn')
  openTheTap(draft, tap, command.use ?? defaultTapUse)
}

function turnTheTapOff(draft: Draft, _tap: TapDefinition, command: CommandOfType<'turnTheTapOff'>): void {
  const runningWater = draft.state.sink.runningWater
  if (runningWater === null) return refuse(draft, command, 'tapAlreadyOff')
  draft.state.sink.runningWater = null
  const openSeconds = draft.state.elapsedSeconds - runningWater.openedAtSeconds
  const itemIdUnderTheTap = itemIdInTheSink(draft.state)
  note(
    draft,
    `tap closed over ${itemIdUnderTheTap ?? 'the empty sink'}: since it ran over ${itemIdUnderTheTap ?? 'the empty sink'}, ${runningWater.filledMl.toFixed(1)} ml went in and ${runningWater.drainedMl.toFixed(1)} ml down the drain; ` +
      `open for ${openSeconds.toFixed(1)} s in all, ${runningWater.drainedSinceOpenedMl.toFixed(1)} ml down the drain since it opened, ${runningWater.hasRunOntoAnItem ? 'having run onto an item' : 'into the empty sink all along'}` +
      describeWhatStandsInTheSink(draft),
  )
  draft.events.push({ type: 'tapTurnedOff', openSeconds, drainedMl: runningWater.drainedSinceOpenedMl, hasRunOntoAnItem: runningWater.hasRunOntoAnItem })
}

function foundTap(draft: Draft): Found<TapDefinition, RefusalReason> {
  const tap = tapOf(draft)
  return tap === null ? refusedWith('noTapInThisRoom', '') : found(tap)
}

function openTheTap(draft: Draft, tap: TapDefinition, use: TapUse): void {
  const itemId = itemIdInTheSink(draft.state)
  draft.state.sink.runningWater = runningWaterOver(draft, itemId, itemId !== null && isClosedAgainstTheTap(draft, itemId), use, null)
  note(
    draft,
    `tap opened over ${itemId ?? 'the empty sink'} to ${use}, water at ${tap.waterTemperatureC} °C, ${tap.flowMlPerSecond} ml/s` +
      (draft.state.sink.runningWater.isRunningOverTheLid ? ', running over the closed lid into the drain' : ''),
  )
  draft.events.push({ type: 'tapTurnedOn' })
}

function describeWhatStandsInTheSink(draft: Draft): string {
  const itemId = itemIdInTheSink(draft.state)
  const vessel = itemId === null ? undefined : draft.state.vessels[itemId]
  return vessel === undefined ? '' : `; ${describeLiquid(vessel)}`
}

function canGoInTheSink(itemId: string): Check {
  return (draft) => (rulesFor(draft.state, itemId)?.runTheTapOnto === null ? { reason: 'cannotGoInTheSink', values: `${itemId} is kept out of the sink` } : null)
}

const isTheSinkFree: Check = (draft) => {
  const occupant = itemIdInTheSink(draft.state)
  return occupant === null ? null : { reason: 'sinkOccupied', values: `${occupant} is in it` }
}

function isClosedAgainstTheTap(draft: Draft, itemId: string): boolean {
  return rulesFor(draft.state, itemId)?.isClosedAgainstTheTap(draft, itemId) === true
}
