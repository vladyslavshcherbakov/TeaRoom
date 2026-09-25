import { definitionIn } from '../Definitions/Catalog.ts'
import { judgeWater, type WaterJudgement } from '../Judgement/WaterJudgement.ts'
import { kilowattHoursUsed } from '../Physics/Heat.ts'
import type { CommandOfType } from './Command.ts'
import { chosenTea, describeLiquid, note, refuse, type Draft } from './Draft.ts'
import { rulesFor } from './ItemKinds.ts'
import { isKnown, isNotBeingPoured, isNotBurntAway, isWithinTheKeepersReach, wasRefusedByAnyOf, type ItemCheck } from './ItemRefusals.ts'
import { liftOutOfTheSink } from './SinkCommands.ts'
import { emptyTheHand, heaterSpotOf, isKeeperAt, locationOfItem, moveItem, whereTheKeeperStands } from './Reach.ts'

export function placeOnHeater(draft: Draft, command: CommandOfType<'placeOnHeater'>): void {
  const itemId = command.itemId
  if (wasRefusedByAnyOf(draft, command, itemId, [isKnown, isNotBurntAway, canSitOnTheHeater, isTheHeaterFree, isNotBeingPoured, isTheKeeperAtTheHeater, isWithinTheKeepersReach])) return
  const heaterSpot = heaterSpotOf(draft)
  const location = locationOfItem(draft, itemId)
  if (location?.kind === 'inHand') emptyTheHand(draft, location.handIndex)
  liftOutOfTheSink(draft, itemId)
  moveItem(draft, itemId, { kind: 'onSurface', spot: heaterSpot })
  draft.state.heater.itemIdOnTop = itemId
  note(draft, `placed on heater: ${rulesFor(draft.state, itemId)?.describeOnTheHeater(draft, itemId) ?? itemId}, heater ${draft.state.heater.isOn ? 'on' : 'off'}`)
  draft.events.push({ type: 'placedOnHeater', itemId })
}

export function liftOffTheHeater(draft: Draft, itemId: string): void {
  const waterJudgement = draft.state.heater.isOn ? judgementOfWaterOnHeater(draft) : null
  if (!draft.state.heater.isOn) note(draft, `${itemId} lifted off a heater that was off, water not judged`)
  draft.state.heater.itemIdOnTop = null
  draft.events.push({ type: 'takenOffHeater', itemId, waterJudgement })
  rulesFor(draft.state, itemId)?.takeOffTheHeater(draft, itemId)
}

export function switchHeaterOn(draft: Draft, command: CommandOfType<'switchHeaterOn'>): void {
  if (draft.state.heater.isOn) return refuse(draft, command, 'heaterAlreadyOn')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  draft.state.heater.isOn = true
  draft.state.heater.switchedOnAtSeconds = draft.state.elapsedSeconds
  draft.state.heater.secondsHeatedByItemId = {}
  draft.state.heater.secondsWasted = 0
  draft.state.heater.hasAnnouncedTargetTemperature = false
  draft.state.heater.hasAnnouncedBoilingAway = false
  note(draft, `heater switched on with ${draft.state.heater.itemIdOnTop ?? 'nothing'} on top`)
  draft.events.push({ type: 'heaterSwitchedOn' })
}

export function switchHeaterOff(draft: Draft, command: CommandOfType<'switchHeaterOff'>): void {
  if (!draft.state.heater.isOn) return refuse(draft, command, 'heaterAlreadyOff')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  switchTheHeaterOff(draft, judgementOfWaterOnHeater(draft), true)
}

export function switchTheHeaterOff(draft: Draft, waterJudgement: WaterJudgement | null, wasSwitchedOffByTheKeeper: boolean): void {
  const heater = draft.state.heater
  heater.isOn = false
  const onSeconds = draft.state.elapsedSeconds - heater.switchedOnAtSeconds
  const heaterDefinition = definitionIn(draft.catalog, 'heaters', heater.definitionId)
  const kilowattHours = kilowattHoursUsed(heaterDefinition, onSeconds)
  const wastedSeconds = heater.secondsWasted
  const kilowattHoursWasted = kilowattHoursUsed(heaterDefinition, wastedSeconds)
  const secondsHeatedByItemId = { ...heater.secondsHeatedByItemId }
  note(
    draft,
    `heater switched off ${wasSwitchedOffByTheKeeper ? 'by the keeper' : 'by the end of the ritual'} after ${onSeconds.toFixed(1)} s on, ${kilowattHours.toFixed(3)} kWh used, having heated ${describeSecondsHeated(secondsHeatedByItemId)}, ` +
      `${wastedSeconds.toFixed(1)} s and ${kilowattHoursWasted.toFixed(3)} kWh of it wasted on the air or on things not made for the heater`,
  )
  draft.events.push({ type: 'heaterSwitchedOff', waterJudgement, onSeconds, kilowattHoursUsed: kilowattHours, wastedSeconds, kilowattHoursWasted, secondsHeatedByItemId, wasSwitchedOffByTheKeeper })
}

function describeSecondsHeated(secondsHeatedByItemId: Readonly<Record<string, number>>): string {
  const heated = Object.entries(secondsHeatedByItemId).map(([itemId, seconds]) => `${itemId} for ${seconds.toFixed(1)} s`)
  return heated.length === 0 ? 'nothing' : heated.join(', ')
}

function isKeeperAtTheHeater(draft: Draft): boolean {
  return isKeeperAt(draft, heaterSpotOf(draft).placeId)
}

function judgementOfWaterOnHeater(draft: Draft): WaterJudgement | null {
  const itemId = draft.state.heater.itemIdOnTop
  const vessel = itemId === null ? undefined : draft.state.vessels[itemId]
  const tea = chosenTea(draft)
  if (vessel === undefined || tea === null) {
    note(draft, `heating stopped with ${itemId ?? 'nothing'} on the heater and tea ${tea?.id ?? 'not chosen'}, water not judged`)
    return null
  }
  const judgement = judgeWater(vessel.liquid.temperatureC, tea)
  const { good, acceptable } = tea.water
  note(
    draft,
    `heating stopped: ${describeLiquid(vessel)} judged ${judgement} for ${tea.id} ` +
      `(good ${good.lowestC}–${good.highestC} °C, acceptable ${acceptable.lowestC}–${acceptable.highestC} °C)`,
  )
  return judgement
}

const canSitOnTheHeater: ItemCheck = (draft, itemId) => (rulesFor(draft.state, itemId)?.canSitOnTheHeater(draft, itemId) === true ? null : { reason: 'cannotSitOnHeater', values: '' })

const isTheHeaterFree: ItemCheck = (draft) => {
  const occupant = draft.state.heater.itemIdOnTop
  return occupant === null ? null : { reason: 'heaterOccupied', values: `${occupant} is on it` }
}

const isTheKeeperAtTheHeater: ItemCheck = (draft) => {
  const heaterPlaceId = heaterSpotOf(draft).placeId
  return isKeeperAt(draft, heaterPlaceId) ? null : { reason: 'notAtThatPlace', values: `${whereTheKeeperStands(draft)}, the heater is at the ${heaterPlaceId}` }
}
