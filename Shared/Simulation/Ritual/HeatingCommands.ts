import { judgeWater, type WaterJudgement } from '../Judgement/WaterJudgement.ts'
import type { CommandOfType } from './Command.ts'
import { chosenTea, describeLiquid, isInvolvedInPour, note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { heaterSpotOf, isKeeperAt, isWithinReach, moveItem, whereIs, whereTheKeeperStands } from './Reach.ts'

export function placeOnHeater(draft: Draft, command: CommandOfType<'placeOnHeater'>): void {
  const vessel = draft.state.vessels[command.vesselId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  if (!vesselDefinitionOf(draft, vessel).canSitOnHeater) return refuse(draft, command, 'cannotSitOnHeater')
  const occupant = draft.state.heater.vesselIdOnTop
  if (occupant !== null) return refuse(draft, command, 'heaterOccupied', `${occupant} is on it`)
  if (isInvolvedInPour(draft, vessel.id)) return refuse(draft, command, 'vesselIsBeingPoured')
  const heaterSpot = heaterSpotOf(draft)
  if (!isKeeperAt(draft, heaterSpot.placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the heater is at the ${heaterSpot.placeId}`)
  if (!isWithinReach(draft, vessel.location)) return refuse(draft, command, 'outOfReach', `${vessel.id} is ${whereIs(vessel.location)}`)
  if (vessel.location.kind === 'inHand') draft.state.keeper.hands[vessel.location.handIndex] = null
  moveItem(draft, vessel.id, { kind: 'onSurface', spot: heaterSpot })
  draft.state.heater.vesselIdOnTop = vessel.id
  note(draft, `placed on heater: ${describeLiquid(vessel)}, heater ${draft.state.heater.isOn ? 'on' : 'off'}`)
  draft.events.push({ type: 'placedOnHeater', vesselId: vessel.id })
}

export function takeOffHeater(draft: Draft, command: CommandOfType<'takeOffHeater'>): void {
  const vesselId = draft.state.heater.vesselIdOnTop
  if (vesselId === null) return refuse(draft, command, 'heaterIsEmpty')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  const waterJudgement = draft.state.heater.isOn ? judgementOfWaterOnHeater(draft) : null
  if (!draft.state.heater.isOn) note(draft, `${vesselId} lifted off a heater that was off, water not judged`)
  draft.state.heater.vesselIdOnTop = null
  draft.events.push({ type: 'takenOffHeater', vesselId, waterJudgement })
}

export function switchHeaterOn(draft: Draft, command: CommandOfType<'switchHeaterOn'>): void {
  if (draft.state.heater.isOn) return refuse(draft, command, 'heaterAlreadyOn')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  draft.state.heater.isOn = true
  draft.state.heater.hasAnnouncedTargetTemperature = false
  draft.state.heater.hasAnnouncedBoilingAway = false
  note(draft, `heater switched on with ${draft.state.heater.vesselIdOnTop ?? 'nothing'} on top`)
  draft.events.push({ type: 'heaterSwitchedOn' })
}

export function switchHeaterOff(draft: Draft, command: CommandOfType<'switchHeaterOff'>): void {
  if (!draft.state.heater.isOn) return refuse(draft, command, 'heaterAlreadyOff')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  draft.state.heater.isOn = false
  draft.events.push({ type: 'heaterSwitchedOff', waterJudgement: judgementOfWaterOnHeater(draft) })
}

function isKeeperAtTheHeater(draft: Draft): boolean {
  return isKeeperAt(draft, heaterSpotOf(draft).placeId)
}

function judgementOfWaterOnHeater(draft: Draft): WaterJudgement | null {
  const vesselId = draft.state.heater.vesselIdOnTop
  const vessel = vesselId === null ? undefined : draft.state.vessels[vesselId]
  const tea = chosenTea(draft)
  if (vessel === undefined || tea === null) {
    note(draft, `heating stopped with ${vesselId ?? 'nothing'} on the heater and tea ${tea?.id ?? 'not chosen'}, water not judged`)
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
