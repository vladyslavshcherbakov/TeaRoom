import type { CommandBook } from '../../Engine/Commands.ts'
import { puddleReachesTheClothRule, soakUpThePuddleRule, wipeTableRule } from './CleanupCommands.ts'
import type { Command } from './Command.ts'
import { fillWithBoilingWaterRule } from './DebugCommands.ts'
import type { Draft } from './Draft.ts'
import { placeOnHeaterRule, setTheThermostatRule, startTheThermostatRule, stopTheThermostatRule, switchHeaterOffRule, switchHeaterOnRule } from './HeatingCommands.ts'
import { scoopTeaRule, tipSpoonIntoRule } from './LeavesCommands.ts'
import { closeVesselLidRule, openVesselLidRule } from './LidCommands.ts'
import { pickUpRule, pickUpWithAMiddleHandRule, putDownRule, standAtRule } from './PlayerCommands.ts'
import { adjustPourRule, startPouringRule, stopPouringRule } from './PouringCommands.ts'
import { offerCupRule, tasteCupRule } from './ServingCommands.ts'
import { chooseAtmosphereRule } from './SessionCommands.ts'
import { putInTheSinkRule, turnTheTapOffRule, turnTheTapOnRule } from './SinkCommands.ts'

export const teaCommandBook: CommandBook<Draft, Command> = {
  chooseAtmosphere: chooseAtmosphereRule,
  standAt: standAtRule,
  pickUp: pickUpRule,
  pickUpWithAMiddleHand: pickUpWithAMiddleHandRule,
  putDown: putDownRule,
  openVesselLid: openVesselLidRule,
  closeVesselLid: closeVesselLidRule,
  placeOnHeater: placeOnHeaterRule,
  switchHeaterOn: switchHeaterOnRule,
  switchHeaterOff: switchHeaterOffRule,
  setTheThermostat: setTheThermostatRule,
  startTheThermostat: startTheThermostatRule,
  stopTheThermostat: stopTheThermostatRule,
  startPouring: startPouringRule,
  adjustPour: adjustPourRule,
  stopPouring: stopPouringRule,
  putInTheSink: putInTheSinkRule,
  turnTheTapOn: turnTheTapOnRule,
  turnTheTapOff: turnTheTapOffRule,
  scoopTea: scoopTeaRule,
  tipSpoonInto: tipSpoonIntoRule,
  tasteCup: tasteCupRule,
  offerCup: offerCupRule,
  wipeTable: wipeTableRule,
  soakUpThePuddle: soakUpThePuddleRule,
  puddleReachesTheCloth: puddleReachesTheClothRule,
  fillWithBoilingWater: fillWithBoilingWaterRule,
}
