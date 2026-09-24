import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import { steepLeaves } from '../Physics/Brewing.ts'
import { coolingPerSecondOf, coolLiquid, heatLiquid, liquidBoiledAway } from '../Physics/Heat.ts'
import { isEmpty } from '../Physics/Liquid.ts'
import { pourStream } from '../Physics/Pouring.ts'
import { fillFromTap } from '../Physics/TapWater.ts'
import { wetMlAfterDrying } from '../Physics/Table.ts'
import type { SessionState } from '../State/SessionState.ts'
import { startOrEndBrews } from './Brews.ts'
import { chosenTea, isClosedAgainstFilling, note, outcomeOf, startDraft, vesselDefinitionOf, type Draft, type Outcome } from './Draft.ts'
import { isKeeperAt } from './Reach.ts'
import { finishFilling } from './TapCommands.ts'

export function simulateStep(state: SessionState, seconds: number, catalog: Catalog): Outcome {
  const draft = startDraft(state, catalog)
  if (state.phase === 'ended') return outcomeOf(draft)
  coolVessels(draft, seconds)
  heatVesselOnHeater(draft, seconds)
  continuePour(draft, seconds)
  continueFilling(draft, seconds)
  steepAllLeaves(draft, seconds)
  draft.state.tableWetMl = wetMlAfterDrying(draft.state.tableWetMl, seconds)
  startOrEndBrews(draft)
  draft.state.elapsedSeconds += seconds
  return outcomeOf(draft)
}

function heatVesselOnHeater(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  const vessel = heater.vesselIdOnTop === null ? undefined : draft.state.vessels[heater.vesselIdOnTop]
  if (!heater.isOn || vessel === undefined) return
  const heaterDefinition = definitionIn(draft.catalog, 'heaters', heater.definitionId)
  const heated = heatLiquid(vessel.liquid, heaterDefinition, seconds)
  vessel.liquid = liquidBoiledAway(heated, heaterDefinition, seconds)
  announceTargetTemperatureOnce(draft, vessel.id, vessel.liquid.temperatureC)
  if (vessel.liquid.volumeMl < heated.volumeMl) noteBoilingAway(draft, vessel.id, heaterDefinition.boilingAwayMlPerSecond, vessel.liquid.volumeMl)
}

function noteBoilingAway(draft: Draft, vesselId: string, mlPerSecond: number, volumeMlLeft: number): void {
  if (!draft.state.heater.hasAnnouncedBoilingAway) {
    draft.state.heater.hasAnnouncedBoilingAway = true
    note(draft, `${vesselId} boils, its water boils away at ${mlPerSecond} ml/s`)
  }
  if (volumeMlLeft === 0) note(draft, `${vesselId} boiled dry on the heater`)
}

function announceTargetTemperatureOnce(draft: Draft, vesselId: string, temperatureC: number): void {
  const tea = chosenTea(draft)
  if (tea === null || draft.state.heater.hasAnnouncedTargetTemperature) return
  if (temperatureC < tea.water.good.lowestC) return
  draft.state.heater.hasAnnouncedTargetTemperature = true
  note(draft, `${vesselId} reached the good range of ${tea.id} at ${temperatureC.toFixed(1)} °C while heating`)
  draft.events.push({ type: 'targetTemperatureReached', vesselId })
}

function coolVessels(draft: Draft, seconds: number): void {
  const ambientC = definitionIn(draft.catalog, 'rooms', draft.state.roomId).ambientTemperatureC
  for (const vessel of Object.values(draft.state.vessels)) {
    const coolingPerSecond = coolingPerSecondOf(vesselDefinitionOf(draft, vessel), vessel.isLidOpen)
    vessel.liquid = coolLiquid(vessel.liquid, ambientC, coolingPerSecond, seconds)
  }
}

function continuePour(draft: Draft, seconds: number): void {
  const pour = draft.state.pour
  const source = pour === null ? undefined : draft.state.vessels[pour.sourceId]
  if (pour === null || source === undefined) return
  const target = pour.targetId === null ? undefined : draft.state.vessels[pour.targetId]
  const landing = pourStream(
    source.liquid,
    vesselDefinitionOf(draft, source),
    target === undefined ? null : { liquid: target.liquid, definition: vesselDefinitionOf(draft, target) },
    pour.tiltDegrees,
    pour.streamOnTargetFraction,
    seconds,
  )
  source.liquid = landing.source
  if (target !== undefined && landing.target !== null) target.liquid = landing.target
  pour.pouredMl += landing.landedMl
  pour.spilledMl += landing.spilledMl
  draft.state.tableWetMl += landing.spilledMl
  if (target !== undefined && landing.overflowedMl > 0 && !pour.hasOverflowed) {
    pour.hasOverflowed = true
    note(draft, `${target.id} overflowed at ${target.liquid.volumeMl.toFixed(1)} ml while pouring from ${source.id}`)
    draft.events.push({ type: 'vesselOverflowed', vesselId: target.id })
  }
  if (isEmpty(source.liquid) && !pour.hasRunDry) {
    pour.hasRunDry = true
    note(draft, `${source.id} ran dry while pouring into ${pour.targetId ?? 'the table'}`)
  }
}

function continueFilling(draft: Draft, seconds: number): void {
  const filling = draft.state.filling
  if (filling === null) return
  const tap = definitionIn(draft.catalog, 'rooms', draft.state.roomId).tap
  const vessel = draft.state.vessels[filling.vesselId]
  if (tap === null || vessel === undefined) return finishFilling(draft, 'there is no tap or vessel')
  if (vessel.location.kind !== 'inHand') return finishFilling(draft, `${vessel.id} left the hand`)
  if (!isKeeperAt(draft, tap.placeId)) return finishFilling(draft, `the keeper left the ${tap.placeId}`)
  const isRunningOverTheLid = isClosedAgainstFilling(draft, vessel)
  if (isRunningOverTheLid !== filling.isRunningOverTheLid) {
    filling.isRunningOverTheLid = isRunningOverTheLid
    note(draft, isRunningOverTheLid ? `${vessel.id} lid closed under the tap, the water runs over it into the sink` : `${vessel.id} lid open under the tap, the water runs in`)
  }
  if (isRunningOverTheLid) {
    filling.overflowedMl += tap.flowMlPerSecond * seconds
    return
  }
  const fill = fillFromTap(vessel.liquid, vesselDefinitionOf(draft, vessel).capacityMl, tap, seconds)
  vessel.liquid = fill.liquid
  filling.filledMl += fill.filledMl
  filling.overflowedMl += fill.overflowedMl
  if (fill.overflowedMl > 0 && !filling.hasOverflowed) {
    filling.hasOverflowed = true
    note(draft, `${vessel.id} is full at ${vessel.liquid.volumeMl.toFixed(1)} ml, the tap water runs over the rim into the sink`)
    draft.events.push({ type: 'vesselOverflowed', vesselId: vessel.id })
  }
}

function steepAllLeaves(draft: Draft, seconds: number): void {
  for (const vessel of Object.values(draft.state.vessels)) {
    if (vessel.leaves === null || !vessel.leaves.isSteeping) continue
    const steeped = steepLeaves(vessel.liquid, vessel.leaves, definitionIn(draft.catalog, 'teas', vessel.leaves.teaId), seconds)
    vessel.liquid = steeped.liquid
    vessel.leaves = steeped.leaves
  }
}
