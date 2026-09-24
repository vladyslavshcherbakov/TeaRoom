import { judgeWater, type WaterJudgement } from '../Judgement/WaterJudgement.ts'
import type { CommandOfType } from './Command.ts'
import { chosenTea, describeLiquid, isInvolvedInPour, note, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { liftOutOfTheSink } from './SinkCommands.ts'
import { heaterSpotOf, isKeeperAt, isWithinReach, moveItem, whereIs, whereTheKeeperStands } from './Reach.ts'

export function placeOnHeater(draft: Draft, command: CommandOfType<'placeOnHeater'>): void {
  const vessel = draft.state.vessels[command.itemId]
  if (vessel === undefined) return refuse(draft, command, 'unknownVessel')
  if (!vesselDefinitionOf(draft, vessel).canSitOnHeater) return refuse(draft, command, 'cannotSitOnHeater')
  const occupant = draft.state.heater.itemIdOnTop
  if (occupant !== null) return refuse(draft, command, 'heaterOccupied', `${occupant} is on it`)
  if (isInvolvedInPour(draft, vessel.id)) return refuse(draft, command, 'vesselIsBeingPoured')
  const heaterSpot = heaterSpotOf(draft)
  if (!isKeeperAt(draft, heaterSpot.placeId)) return refuse(draft, command, 'notAtThatPlace', `${whereTheKeeperStands(draft)}, the heater is at the ${heaterSpot.placeId}`)
  if (!isWithinReach(draft, vessel.location)) return refuse(draft, command, 'outOfReach', `${vessel.id} is ${whereIs(vessel.location)}`)
  if (vessel.location.kind === 'inHand') draft.state.keeper.hands[vessel.location.handIndex] = null
  liftOutOfTheSink(draft, vessel.id)
  moveItem(draft, vessel.id, { kind: 'onSurface', spot: heaterSpot })
  draft.state.heater.itemIdOnTop = vessel.id
  note(draft, `placed on heater: ${describeLiquid(vessel)}, heater ${draft.state.heater.isOn ? 'on' : 'off'}`)
  draft.events.push({ type: 'placedOnHeater', itemId: vessel.id })
}

export function liftOffTheHeater(draft: Draft, itemId: string): void {
  const waterJudgement = draft.state.heater.isOn ? judgementOfWaterOnHeater(draft) : null
  if (!draft.state.heater.isOn) note(draft, `${itemId} lifted off a heater that was off, water not judged`)
  draft.state.heater.itemIdOnTop = null
  draft.events.push({ type: 'takenOffHeater', itemId, waterJudgement })
}

export function switchHeaterOn(draft: Draft, command: CommandOfType<'switchHeaterOn'>): void {
  if (draft.state.heater.isOn) return refuse(draft, command, 'heaterAlreadyOn')
  if (!isKeeperAtTheHeater(draft)) return refuse(draft, command, 'notAtThatPlace', whereTheKeeperStands(draft))
  draft.state.heater.isOn = true
  draft.state.heater.hasAnnouncedTargetTemperature = false
  draft.state.heater.hasAnnouncedBoilingAway = false
  note(draft, `heater switched on with ${draft.state.heater.itemIdOnTop ?? 'nothing'} on top`)
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
