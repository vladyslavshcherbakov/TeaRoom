import { definitionIn } from '../Definitions/Catalog.ts'
import type { HeaterDefinition } from '../Definitions/HeaterDefinition.ts'
import { judgeWater, type WaterJudgement } from '../Judgement/WaterJudgement.ts'
import { kilowattHoursUsed } from '../Physics/Heat.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import type { HeaterState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { chosenTea, describeLiquid, note, refuse, type Draft } from './Draft.ts'
import { rulesFor } from './ItemKinds.ts'
import { isKnown, isNotBeingPoured, isNotBurntAway, isWithinTheKeepersReach, wasRefusedByAnyOf, type ItemCheck } from './ItemRefusals.ts'
import { liftOutOfTheSink } from './SinkCommands.ts'
import { emptyTheHand, heaterSpotOf, isKeeperAt, locationOfItem, moveItem, whereTheKeeperStands } from './Reach.ts'

export type HeaterSwitchedOffBy = 'byTheKeeper' | 'byTheEndOfTheRitual'

const switchedOffWords: Readonly<Record<HeaterSwitchedOffBy, string>> = { byTheKeeper: 'by the keeper', byTheEndOfTheRitual: 'by the end of the ritual' }

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
  const isInUse = isTheHeaterInUse(draft.state.heater)
  const waterJudgement = isInUse ? judgementOfWaterOnHeater(draft) : null
  if (!isInUse) note(draft, `${itemId} lifted off a heater that was off, water not judged`)
  draft.state.heater.itemIdOnTop = null
  draft.events.push({ type: 'takenOffHeater', itemId, waterJudgement })
  rulesFor(draft.state, itemId)?.takeOffTheHeater(draft, itemId)
}

export function switchHeaterOn(draft: Draft, command: CommandOfType<'switchHeaterOn'>): void {
  const heater = draft.state.heater
  if (isTheHeaterInUse(heater)) return refuse(draft, command, 'heaterAlreadyOn', describeTheHeatersControl(heater))
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  beginToUseTheHeater(draft)
  heater.isOn = true
  heater.holdsTheThermostatsTarget = command.holdsTheThermostatsTarget === true
  if (heater.holdsTheThermostatsTarget) note(draft, `the heater heats the water on it up to the thermostat's ${heater.thermostat.targetC} °C and holds it there until it is switched off`)
  note(draft, `heater switched on with ${heater.itemIdOnTop ?? 'nothing'} on top`)
  draft.events.push({ type: 'heaterSwitchedOn' })
}

export function switchHeaterOff(draft: Draft, command: CommandOfType<'switchHeaterOff'>): void {
  const heater = draft.state.heater
  if (!isTheHeaterInUse(heater)) return refuse(draft, command, 'heaterAlreadyOff')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  if (heater.thermostat.isOn) note(draft, `the heater's switch stops the thermostat too, which was ${heater.isOn ? 'heating' : 'waiting'} at ${heater.thermostat.targetC} °C`)
  switchTheHeaterOff(draft, judgementOfWaterOnHeater(draft), 'byTheKeeper')
}

export function setTheThermostat(draft: Draft, command: CommandOfType<'setTheThermostat'>): void {
  const thermostat = draft.state.heater.thermostat
  const { lowestC, highestC } = heaterDefinitionOf(draft).thermostat
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  if (command.targetC < lowestC || command.targetC > highestC) return refuse(draft, command, 'thermostatOutOfRange', `${command.targetC} °C is outside ${lowestC}–${highestC} °C`)
  const previousTargetC = thermostat.targetC
  thermostat.targetC = command.targetC
  note(draft, `thermostat set from ${previousTargetC} °C to ${command.targetC} °C, ${thermostat.isOn ? 'working' : 'not working'}`)
  draft.events.push({ type: 'thermostatSet', targetC: command.targetC })
}

export function startTheThermostat(draft: Draft, command: CommandOfType<'startTheThermostat'>): void {
  const heater = draft.state.heater
  if (heater.thermostat.isOn) return refuse(draft, command, 'thermostatAlreadyOn')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  if (!heater.isOn) beginToUseTheHeater(draft)
  heater.thermostat.isOn = true
  note(draft, `thermostat started at ${heater.thermostat.targetC} °C with ${heater.itemIdOnTop ?? 'nothing'} on top, the heater ${heater.isOn ? 'was heating by hand' : 'was off'}`)
  draft.events.push({ type: 'thermostatStarted', targetC: heater.thermostat.targetC })
}

export function stopTheThermostat(draft: Draft, command: CommandOfType<'stopTheThermostat'>): void {
  if (!draft.state.heater.thermostat.isOn) return refuse(draft, command, 'thermostatAlreadyOff')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  note(draft, 'thermostat stopped, so the heater is switched off')
  switchTheHeaterOff(draft, judgementOfWaterOnHeater(draft), 'byTheKeeper')
}

export function isTheHeaterInUse(heater: DeepReadonly<HeaterState>): boolean {
  return heater.isOn || heater.thermostat.isOn
}

export function switchTheHeaterOff(draft: Draft, waterJudgement: WaterJudgement | null, switchedOff: HeaterSwitchedOffBy): void {
  const heater = draft.state.heater
  const wasSwitchedOffByTheKeeper = switchedOff === 'byTheKeeper'
  heater.isOn = false
  heater.thermostat.isOn = false
  heater.holdsTheThermostatsTarget = false
  const onSeconds = draft.state.elapsedSeconds - heater.switchedOnAtSeconds
  const heaterDefinition = definitionIn(draft.catalog, 'heaters', heater.definitionId)
  const kilowattHours = kilowattHoursUsed(heaterDefinition, heater.secondsHeating)
  const wastedSeconds = heater.secondsWasted
  const kilowattHoursWasted = kilowattHoursUsed(heaterDefinition, wastedSeconds)
  const secondsHeatedByItemId = { ...heater.secondsHeatedByItemId }
  note(
    draft,
    `heater switched off ${switchedOffWords[switchedOff]} after ${onSeconds.toFixed(1)} s in use, ${heater.secondsHeating.toFixed(1)} s of it heating, ${kilowattHours.toFixed(3)} kWh used, having heated ${describeSecondsHeated(secondsHeatedByItemId)}, ` +
      `${wastedSeconds.toFixed(1)} s and ${kilowattHoursWasted.toFixed(3)} kWh of it wasted on the air or on things not made for the heater`,
  )
  draft.events.push({ type: 'heaterSwitchedOff', waterJudgement, onSeconds, kilowattHoursUsed: kilowattHours, wastedSeconds, kilowattHoursWasted, secondsHeatedByItemId, wasSwitchedOffByTheKeeper })
}

function beginToUseTheHeater(draft: Draft): void {
  const heater = draft.state.heater
  heater.switchedOnAtSeconds = draft.state.elapsedSeconds
  heater.secondsHeatedByItemId = {}
  heater.secondsWasted = 0
  heater.secondsHeating = 0
  heater.hasAnnouncedTargetTemperature = false
  heater.hasAnnouncedBoilingAway = false
}

function describeTheHeatersControl(heater: DeepReadonly<HeaterState>): string {
  return heater.thermostat.isOn ? `its thermostat works at ${heater.thermostat.targetC} °C, ${heater.isOn ? 'heating' : 'waiting'}` : 'it was switched on by hand'
}

function heaterDefinitionOf(draft: Draft): HeaterDefinition {
  return definitionIn(draft.catalog, 'heaters', draft.state.heater.definitionId)
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
