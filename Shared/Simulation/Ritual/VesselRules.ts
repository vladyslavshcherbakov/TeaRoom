import { definitionIn } from '../Definitions/Catalog.ts'
import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import { heatLiquid, isTooHotToHold, liquidBoiledAway, shareOfTheHeatKeptBy } from '../Physics/Heat.ts'
import { water } from '../Physics/Liquid.ts'
import { fillFromTap, leafGramsLeftAfterRunningOver } from '../Physics/TapWater.ts'
import type { RunningWaterState, VesselState } from '../State/SessionState.ts'
import { chosenTea, describeLiquid, isClosedAgainstFilling, note, vesselDefinitionOf, type Draft } from './Draft.ts'
import type { ItemKindRules } from './ItemKinds.ts'
import { percent } from './Percent.ts'
import { drain } from './RunningWater.ts'

export const vesselRules: ItemKindRules = {
  canSitOnTheHeater: (draft, itemId) => {
    const vessel = draft.state.vessels[itemId]
    return vessel !== undefined && vesselDefinitionOf(draft, vessel).canSitOnHeater
  },
  isMadeForTheHeater: (draft, itemId) => {
    const vessel = draft.state.vessels[itemId]
    return vessel !== undefined && vesselDefinitionOf(draft, vessel).isMadeForTheHeater
  },
  describeOnTheHeater: (draft, itemId) => {
    const vessel = draft.state.vessels[itemId]
    return vessel === undefined ? itemId : describeLiquid(vessel)
  },
  heatOnTheWorkingHeater: (draft, itemId, seconds) => withTheVessel(draft, itemId, (vessel) => heatTheVessel(draft, vessel, seconds)),
  takeOffTheHeater: () => undefined,
  runTheTapOnto: (draft, itemId, runningWater, tap, seconds) => withTheVessel(draft, itemId, (vessel) => fillTheVessel(draft, vessel, runningWater, tap, seconds)),
  liftOutOfTheSink: (draft, itemId) => withTheVessel(draft, itemId, (vessel) => pourAwayTheRinseWaterIfItRanOver(draft, vessel)),
  takeIntoAHand: (draft, itemId) => {
    withTheVessel(draft, itemId, (vessel) => closeTheLidAsItIsTaken(draft, vessel))
    return 'whole'
  },
  refusalToHold: (draft, itemId) => {
    const shellHeat = draft.state.vessels[itemId]?.shellHeat ?? 0
    return isTooHotToHold(shellHeat) ? { reason: 'tooHotToHold', values: `${itemId}'s metal is at ${percent(shellHeat)} of red heat` } : null
  },
  isClosedAgainstTheTap: (draft, itemId) => {
    const vessel = draft.state.vessels[itemId]
    return vessel !== undefined && isClosedAgainstFilling(draft, vessel)
  },
}

function withTheVessel(draft: Draft, itemId: string, act: (vessel: VesselState) => void): void {
  const vessel = draft.state.vessels[itemId]
  if (vessel !== undefined) act(vessel)
}

function heatTheVessel(draft: Draft, vessel: VesselState, seconds: number): void {
  const heaterDefinition = definitionIn(draft.catalog, 'heaters', draft.state.heater.definitionId)
  const heater = draft.state.heater
  const highestC = heater.holdsTheThermostatsTarget && !heater.thermostat.isOn ? heater.thermostat.targetC : undefined
  const heated = heatLiquid(vessel.liquid, heaterDefinition, shareOfTheHeatKeptBy(vesselDefinitionOf(draft, vessel), vessel.isLidOpen), seconds, highestC)
  vessel.liquid = liquidBoiledAway(heated, heaterDefinition, seconds)
  announceTargetTemperatureOnce(draft, vessel.id, vessel.liquid.temperatureC)
  if (vessel.liquid.volumeMl < heated.volumeMl) noteBoilingAway(draft, vessel, heaterDefinition.boilingAwayMlPerSecond)
}

function noteBoilingAway(draft: Draft, vessel: VesselState, mlPerSecond: number): void {
  if (!draft.state.heater.hasAnnouncedBoilingAway) {
    draft.state.heater.hasAnnouncedBoilingAway = true
    note(draft, `${vessel.id} boils, its water boils away at ${mlPerSecond} ml/s`)
  }
  if (vessel.liquid.volumeMl > 0) return
  const wasFullAndOnlyBoiledDown = vessel.hasOnlyBoiledDownSinceFull
  vessel.hasOnlyBoiledDownSinceFull = false
  note(draft, `${vessel.id} boiled dry on the heater, ${wasFullAndOnlyBoiledDown ? 'all of it boiled away from the brim' : 'after water was taken from it or it was never full'}`)
  draft.events.push({ type: 'boiledDry', vesselId: vessel.id, wasFullAndOnlyBoiledDown })
}

function announceTargetTemperatureOnce(draft: Draft, vesselId: string, temperatureC: number): void {
  const tea = chosenTea(draft)
  if (tea === null || draft.state.heater.hasAnnouncedTargetTemperature) return
  if (temperatureC < tea.water.good.lowestC) return
  draft.state.heater.hasAnnouncedTargetTemperature = true
  note(draft, `${vesselId} reached the good range of ${tea.id} at ${temperatureC.toFixed(1)} °C while heating`)
  draft.events.push({ type: 'targetTemperatureReached', vesselId })
}

function fillTheVessel(draft: Draft, vessel: VesselState, runningWater: RunningWaterState, tap: TapDefinition, seconds: number): void {
  const isRunningOverTheLid = isClosedAgainstFilling(draft, vessel)
  if (isRunningOverTheLid !== runningWater.isRunningOverTheLid) {
    runningWater.isRunningOverTheLid = isRunningOverTheLid
    note(draft, isRunningOverTheLid ? `${vessel.id} lid closed under the tap, the water runs over it into the drain` : `${vessel.id} lid open under the tap, the water runs in`)
  }
  if (isRunningOverTheLid) {
    drain(runningWater, tap.flowMlPerSecond * seconds)
    return
  }
  const capacityMl = vesselDefinitionOf(draft, vessel).capacityMl
  const fill = fillFromTap(vessel.liquid, capacityMl, tap, seconds)
  vessel.liquid = fill.liquid
  runningWater.filledMl += fill.filledMl
  drain(runningWater, fill.overflowedMl)
  if (fill.overflowedMl > 0) {
    draft.state.sink.hasRunOverTheItemInside = true
    washTheLeavesOut(draft, vessel, fill.overflowedMl, capacityMl)
  }
  if (fill.overflowedMl > 0 && !runningWater.hasOverflowed) {
    runningWater.hasOverflowed = true
    note(draft, `${vessel.id} is full at ${vessel.liquid.volumeMl.toFixed(1)} ml, the tap water runs over the rim into the drain`)
    draft.events.push({ type: 'vesselOverflowed', vesselId: vessel.id })
  }
}

function washTheLeavesOut(draft: Draft, vessel: VesselState, overflowedMl: number, capacityMl: number): void {
  if (vessel.leaves === null) return
  const grams = leafGramsLeftAfterRunningOver(vessel.leaves.grams, overflowedMl, capacityMl)
  if (grams > 0) {
    vessel.leaves = { ...vessel.leaves, grams }
    return
  }
  vessel.leaves = null
  note(draft, `the running water washed the last leaves out of ${vessel.id}, which holds ${describeLiquid(vessel)}`)
  draft.events.push({ type: 'lastLeavesWashedOut', vesselId: vessel.id })
}

function pourAwayTheRinseWaterIfItRanOver(draft: Draft, vessel: VesselState): void {
  if (!draft.state.sink.hasRunOverTheItemInside || !vesselDefinitionOf(draft, vessel).isDrinkable) return
  note(draft, `${vessel.id} was rinsed until the tap ran over its rim, so its water is poured away as it leaves the sink: ${describeLiquid(vessel)}`)
  vessel.liquid = water(0, vessel.liquid.temperatureC)
  vessel.hasOnlyBoiledDownSinceFull = false
}

function closeTheLidAsItIsTaken(draft: Draft, vessel: VesselState): void {
  if (!vessel.isLidOpen) return
  vessel.isLidOpen = false
  note(draft, `${vessel.id} lid closed as it was taken`)
  draft.events.push({ type: 'vesselLidClosed', vesselId: vessel.id })
}
