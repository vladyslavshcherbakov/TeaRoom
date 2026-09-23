import { judgeWater, type WaterJudgement } from '../Judgement/WaterJudgement.ts'
import type { CommandOfType } from './Command.ts'
import { chosenTea, isInvolvedInPour, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'

export function placeOnHeater(draft: Draft, command: CommandOfType<'placeOnHeater'>): void {
  const vessel = draft.state.vessels[command.vesselId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  if (!vesselDefinitionOf(draft, vessel).canSitOnHeater) return refuse(draft, command, 'cannotSitOnHeater')
  if (draft.state.heater.vesselIdOnTop !== null) return refuse(draft, command, 'heaterOccupied')
  if (isInvolvedInPour(draft, vessel.id)) return refuse(draft, command, 'vesselIsBeingPoured')
  draft.state.heater.vesselIdOnTop = vessel.id
  draft.events.push({ type: 'placedOnHeater', vesselId: vessel.id })
}

export function takeOffHeater(draft: Draft, command: CommandOfType<'takeOffHeater'>): void {
  const vesselId = draft.state.heater.vesselIdOnTop
  if (vesselId === null) return refuse(draft, command, 'heaterIsEmpty')
  const waterJudgement = draft.state.heater.isOn ? judgementOfWaterOnHeater(draft) : null
  draft.state.heater.vesselIdOnTop = null
  draft.events.push({ type: 'takenOffHeater', vesselId, waterJudgement })
}

export function switchHeaterOn(draft: Draft, command: CommandOfType<'switchHeaterOn'>): void {
  if (draft.state.heater.isOn) return refuse(draft, command, 'heaterAlreadyOn')
  draft.state.heater.isOn = true
  draft.state.heater.hasAnnouncedTargetTemperature = false
  draft.events.push({ type: 'heaterSwitchedOn' })
}

export function switchHeaterOff(draft: Draft, command: CommandOfType<'switchHeaterOff'>): void {
  if (!draft.state.heater.isOn) return refuse(draft, command, 'heaterAlreadyOff')
  draft.state.heater.isOn = false
  draft.events.push({ type: 'heaterSwitchedOff', waterJudgement: judgementOfWaterOnHeater(draft) })
}

function judgementOfWaterOnHeater(draft: Draft): WaterJudgement | null {
  const vesselId = draft.state.heater.vesselIdOnTop
  const vessel = vesselId === null ? undefined : draft.state.vessels[vesselId]
  const tea = chosenTea(draft)
  if (vessel === undefined || tea === null) return null
  return judgeWater(vessel.liquid.temperatureC, tea)
}
