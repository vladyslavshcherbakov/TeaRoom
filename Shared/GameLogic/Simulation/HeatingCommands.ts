import { definitionIn } from '../../Engine/Catalog.ts'
import type { HeaterDefinition } from '../Definitions/HeaterDefinition.ts'
import { kilowattHoursUsed } from '../Chemistry/Heat.ts'
import type { CommandOfType } from './Command.ts'
import { type Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { commandRule, refuse } from '../../Engine/Commands.ts'
import type { TeaCommandEntry } from './TeaCommandEntry.ts'
import { describeTheHeatersControl, isHeating, isTheHeaterInUse, isTheThermostatWorking, nextHeaterMode } from '../Judgement/HeaterModes.ts'
import { itemIdOnTheHeater } from '../State/WhereItemsAre.ts'
import { describeOnTheHeater, rulesFor } from './ItemKinds.ts'
import { isKnown, isNotBeingPoured, isNotBurntAway, isThePlayerAt, isWithinThePlayersReach, type Check } from './ItemRefusals.ts'
import { moveItem } from './MoveItem.ts'
import { heaterSpotOf } from './Reach.ts'

export const placeOnHeaterRule: TeaCommandEntry<'placeOnHeater'> = commandRule({
  checks: ({ itemId }) => [isKnown(itemId), isNotBurntAway(itemId), isWithinThePlayersReach(itemId), isThePlayerAtTheHeater, canSitOnTheHeater(itemId), isTheHeaterFree, isNotBeingPoured(itemId)],
  carryOut: placeOnHeater,
})

export const switchHeaterOnRule: TeaCommandEntry<'switchHeaterOn'> = commandRule({ checks: () => [isThePlayerAtTheHeater], carryOut: switchHeaterOn })

export const switchHeaterOffRule: TeaCommandEntry<'switchHeaterOff'> = commandRule({ checks: () => [isThePlayerAtTheHeater], carryOut: switchHeaterOff })

export const setTheThermostatRule: TeaCommandEntry<'setTheThermostat'> = commandRule({ checks: () => [isThePlayerAtTheHeater], carryOut: setTheThermostat })

export const startTheThermostatRule: TeaCommandEntry<'startTheThermostat'> = commandRule({ checks: () => [isThePlayerAtTheHeater], carryOut: startTheThermostat })

export const stopTheThermostatRule: TeaCommandEntry<'stopTheThermostat'> = commandRule({ checks: () => [isThePlayerAtTheHeater], carryOut: stopTheThermostat })

function placeOnHeater(draft: Draft, command: CommandOfType<'placeOnHeater'>): void {
  const itemId = command.itemId
  if (moveItem(draft, itemId, { kind: 'onTheHeater', spot: heaterSpotOf(draft) }) === 'crumbled') return
  note(draft, `placed on heater: ${describeOnTheHeater(draft, itemId)}, heater ${isHeating(draft.state.heater.mode) ? 'on' : 'off'}`)
  draft.events.push({ type: 'placedOnHeater', itemId })
}

function switchHeaterOn(draft: Draft, command: CommandOfType<'switchHeaterOn'>): void {
  const heater = draft.state.heater
  if (isTheHeaterInUse(heater.mode)) return refuse(draft, command, 'heaterAlreadyOn', describeTheHeatersControl(heater.mode, heater.thermostatTargetC))
  beginToUseTheHeater(draft)
  const holdsTheThermostatsTarget = command.holdsTheThermostatsTarget === true
  heater.mode = nextHeaterMode(heater.mode, { kind: 'switchedOn', holdsTheThermostatsTarget })
  if (holdsTheThermostatsTarget) note(draft, `the heater heats the water on it up to the thermostat's ${heater.thermostatTargetC} °C and holds it there until it is switched off`)
  note(draft, `heater switched on with ${itemIdOnTheHeater(draft.state) ?? 'nothing'} on top`)
  draft.events.push({ type: 'heaterSwitchedOn' })
}

function switchHeaterOff(draft: Draft, command: CommandOfType<'switchHeaterOff'>): void {
  const heater = draft.state.heater
  if (!isTheHeaterInUse(heater.mode)) return refuse(draft, command, 'heaterAlreadyOff')
  if (isTheThermostatWorking(heater.mode)) note(draft, `the heater's switch stops the thermostat too, which was ${isHeating(heater.mode) ? 'heating' : 'waiting'} at ${heater.thermostatTargetC} °C`)
  switchTheHeaterOff(draft)
}

function setTheThermostat(draft: Draft, command: CommandOfType<'setTheThermostat'>): void {
  const heater = draft.state.heater
  const { lowestC, highestC } = heaterDefinitionOf(draft).thermostat
  if (command.targetC < lowestC || command.targetC > highestC) return refuse(draft, command, 'thermostatOutOfRange', `${command.targetC} °C is outside ${lowestC}–${highestC} °C`)
  const previousTargetC = heater.thermostatTargetC
  heater.thermostatTargetC = command.targetC
  note(draft, `thermostat set from ${previousTargetC} °C to ${command.targetC} °C, ${isTheThermostatWorking(heater.mode) ? 'working' : 'not working'}`)
  draft.events.push({ type: 'thermostatSet', targetC: command.targetC })
}

function startTheThermostat(draft: Draft, command: CommandOfType<'startTheThermostat'>): void {
  const heater = draft.state.heater
  if (isTheThermostatWorking(heater.mode)) return refuse(draft, command, 'thermostatAlreadyOn', `the thermostat works at ${heater.thermostatTargetC} °C`)
  if (!isTheHeaterInUse(heater.mode)) beginToUseTheHeater(draft)
  const controlBefore = describeTheHeatersControl(heater.mode, heater.thermostatTargetC)
  heater.mode = nextHeaterMode(heater.mode, { kind: 'thermostatStarted' })
  note(draft, `thermostat started at ${heater.thermostatTargetC} °C with ${itemIdOnTheHeater(draft.state) ?? 'nothing'} on top, the heater was ${controlBefore}`)
  draft.events.push({ type: 'thermostatStarted', targetC: heater.thermostatTargetC })
}

function stopTheThermostat(draft: Draft, command: CommandOfType<'stopTheThermostat'>): void {
  if (!isTheThermostatWorking(draft.state.heater.mode)) return refuse(draft, command, 'thermostatAlreadyOff')
  note(draft, 'thermostat stopped, so the heater is switched off')
  switchTheHeaterOff(draft)
}

function switchTheHeaterOff(draft: Draft): void {
  const heater = draft.state.heater
  heater.mode = nextHeaterMode(heater.mode, { kind: 'switchedOff' })
  const onSeconds = draft.state.elapsedSeconds - heater.switchedOnAtSeconds
  const heaterDefinition = definitionIn(draft.catalog, 'heaters', heater.definitionId)
  const kilowattHours = kilowattHoursUsed(heaterDefinition, heater.secondsHeating)
  const wastedSeconds = heater.secondsWasted
  const kilowattHoursWasted = kilowattHoursUsed(heaterDefinition, wastedSeconds)
  const secondsHeatedByItemId = { ...heater.secondsHeatedByItemId }
  note(
    draft,
    `heater switched off by the player after ${onSeconds.toFixed(1)} s in use, ${heater.secondsHeating.toFixed(1)} s of it heating, ${kilowattHours.toFixed(3)} kWh used, having heated ${describeSecondsHeated(secondsHeatedByItemId)}, ` +
      `${wastedSeconds.toFixed(1)} s and ${kilowattHoursWasted.toFixed(3)} kWh of it wasted on the air or on things not made for the heater; on it: ${describeWhatIsOnTheHeater(draft)}`,
  )
  draft.events.push({ type: 'heaterSwitchedOff', onSeconds, kilowattHoursUsed: kilowattHours, wastedSeconds, kilowattHoursWasted, secondsHeatedByItemId })
}

function beginToUseTheHeater(draft: Draft): void {
  const heater = draft.state.heater
  heater.switchedOnAtSeconds = draft.state.elapsedSeconds
  heater.secondsHeatedByItemId = {}
  heater.secondsWasted = 0
  heater.secondsHeating = 0
  heater.hasAnnouncedBoilingAway = false
}

function heaterDefinitionOf(draft: Draft): HeaterDefinition {
  return definitionIn(draft.catalog, 'heaters', draft.state.heater.definitionId)
}

function describeSecondsHeated(secondsHeatedByItemId: Readonly<Record<string, number>>): string {
  const heated = Object.entries(secondsHeatedByItemId).map(([itemId, seconds]) => `${itemId} for ${seconds.toFixed(1)} s`)
  return heated.length === 0 ? 'nothing' : heated.join(', ')
}

function canSitOnTheHeater(itemId: string): Check {
  return (draft) => (rulesFor(draft.state, itemId)?.canSitOnTheHeater(draft, itemId) === true ? null : { reason: 'cannotSitOnHeater', values: `${itemId} may not sit on the heater` })
}

const isTheHeaterFree: Check = (draft) => {
  const occupant = itemIdOnTheHeater(draft.state)
  return occupant === null ? null : { reason: 'heaterOccupied', values: `${occupant} is on it` }
}

const isThePlayerAtTheHeater: Check = (draft) => isThePlayerAt(heaterSpotOf(draft).placeId, 'the heater')(draft)

function describeWhatIsOnTheHeater(draft: Draft): string {
  const itemId = itemIdOnTheHeater(draft.state)
  return itemId === null ? 'nothing' : describeOnTheHeater(draft, itemId)
}
