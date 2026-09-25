import { definitionIn } from '../Definitions/Catalog.ts'
import { judgeWater, type WaterJudgement } from '../Judgement/WaterJudgement.ts'
import { kilowattHoursUsed } from '../Physics/Heat.ts'
import type { CommandOfType } from './Command.ts'
import { chosenTea, describeLiquid, isInvolvedInPour, note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { liftOutOfTheSink } from './SinkCommands.ts'
import { emptyTheHand, heaterSpotOf, isACloth, isKeeperAt, isWithinReach, locationOfItem, moveItem, spoonItemId, whereIs, whereTheKeeperStands } from './Reach.ts'
import { percent } from './Percent.ts'

export function placeOnHeater(draft: Draft, command: CommandOfType<'placeOnHeater'>): void {
  const itemId = command.itemId
  const location = locationOfItem(draft, itemId)
  if (location === undefined) return refuse(draft, command, 'unknownItem')
  if (location.kind === 'gone') return refuse(draft, command, 'burntAway')
  if (!canSitOnTheHeater(draft, itemId)) return refuse(draft, command, 'cannotSitOnHeater')
  const occupant = draft.state.heater.itemIdOnTop
  if (occupant !== null) return refuse(draft, command, 'heaterOccupied', `${occupant} is on it`)
  if (isInvolvedInPour(draft, itemId)) return refuse(draft, command, 'vesselIsBeingPoured')
  const heaterSpot = heaterSpotOf(draft)
  if (!isKeeperAt(draft, heaterSpot.placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the heater is at the ${heaterSpot.placeId}`)
  if (!isWithinReach(draft, location)) return refuse(draft, command, 'outOfReach', `${itemId} is ${whereIs(location)}`)
  if (location.kind === 'inHand') emptyTheHand(draft, location.handIndex)
  liftOutOfTheSink(draft, itemId)
  moveItem(draft, itemId, { kind: 'onSurface', spot: heaterSpot })
  draft.state.heater.itemIdOnTop = itemId
  note(draft, `placed on heater: ${describeWhatSitsOnTheHeater(draft, itemId)}, heater ${draft.state.heater.isOn ? 'on' : 'off'}`)
  draft.events.push({ type: 'placedOnHeater', itemId })
}

export function liftOffTheHeater(draft: Draft, itemId: string): void {
  const waterJudgement = draft.state.heater.isOn ? judgementOfWaterOnHeater(draft) : null
  if (!draft.state.heater.isOn) note(draft, `${itemId} lifted off a heater that was off, water not judged`)
  draft.state.heater.itemIdOnTop = null
  draft.events.push({ type: 'takenOffHeater', itemId, waterJudgement })
  const cloth = draft.state.cloths[itemId]
  if (cloth === undefined) return
  note(draft, `${cloth.id} is taken off the heater ${percent(cloth.charring)} charred`)
  draft.events.push({ type: 'clothTakenOffTheHeater', clothId: cloth.id, charring: cloth.charring })
}

export function switchHeaterOn(draft: Draft, command: CommandOfType<'switchHeaterOn'>): void {
  if (draft.state.heater.isOn) return refuse(draft, command, 'heaterAlreadyOn')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  draft.state.heater.isOn = true
  draft.state.heater.switchedOnAtSeconds = draft.state.elapsedSeconds
  draft.state.heater.secondsHeatedByItemId = {}
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
  const kilowattHours = kilowattHoursUsed(definitionIn(draft.catalog, 'heaters', heater.definitionId), onSeconds)
  const secondsHeatedByItemId = { ...heater.secondsHeatedByItemId }
  note(draft, `heater switched off ${wasSwitchedOffByTheKeeper ? 'by the keeper' : 'by the end of the ritual'} after ${onSeconds.toFixed(1)} s on, ${kilowattHours.toFixed(3)} kWh used, having heated ${describeSecondsHeated(secondsHeatedByItemId)}`)
  draft.events.push({ type: 'heaterSwitchedOff', waterJudgement, onSeconds, kilowattHoursUsed: kilowattHours, secondsHeatedByItemId, wasSwitchedOffByTheKeeper })
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

function canSitOnTheHeater(draft: Draft, itemId: string): boolean {
  const vessel = draft.state.vessels[itemId]
  if (vessel !== undefined) return vesselDefinitionOf(draft, vessel).canSitOnHeater
  return isACloth(draft.state, itemId) || itemId === spoonItemId
}

function describeWhatSitsOnTheHeater(draft: Draft, itemId: string): string {
  const vessel = draft.state.vessels[itemId]
  if (vessel !== undefined) return describeLiquid(vessel)
  if (itemId === spoonItemId) return `the spoon, ${percent(draft.state.spoon.charring)} charred`
  const cloth = draft.state.cloths[itemId]
  if (cloth === undefined) return itemId
  return `${cloth.id} holding ${cloth.wetMl.toFixed(1)} ml, ${percent(cloth.charring)} charred`
}
