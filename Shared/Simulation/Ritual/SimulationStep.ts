import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import { steepLeaves } from '../Physics/Brewing.ts'
import { coolingPerSecondOf, coolLiquid, doesTheSpoonCrumble, heatLiquid, isTooHotToHold, liquidBoiledAway, shellHeatAfter, spoonCharringOnAHotPlate } from '../Physics/Heat.ts'
import { isEmpty } from '../Physics/Liquid.ts'
import { pourStream } from '../Physics/Pouring.ts'
import { fillFromTap, leafGramsLeftAfterRunningOver } from '../Physics/TapWater.ts'
import { clothCharringAfterWashing, clothCharringOnAHotPlate, clothStainAfterWashing, clothWetMlAfterDrying, clothWetMlOnAHotPlate, clothWetMlUnderTheTap, mlSoakedUp } from '../Physics/Table.ts'
import { takeIntoTheCloth } from './CleanupCommands.ts'
import type { RunningWaterState, SessionState, VesselState } from '../State/SessionState.ts'
import { startOrEndBrews } from './Brews.ts'
import { chosenTea, describeLiquid, isClosedAgainstFilling, note, outcomeOf, startDraft, vesselDefinitionOf, type Draft, type Outcome } from './Draft.ts'
import { clothItemId, spoonItemId, tapOf } from './Reach.ts'
import { dryThePuddles, placeWhereAPourSpills, spill } from './Puddles.ts'

export function simulateStep(state: SessionState, seconds: number, catalog: Catalog): Outcome {
  const draft = startDraft(state, catalog)
  if (state.phase === 'ended') return outcomeOf(draft)
  coolVessels(draft, seconds)
  heatVesselOnHeater(draft, seconds)
  heatOrCoolMetalShells(draft, seconds)
  heatTheClothOnTheHeater(draft, seconds)
  charTheSpoonOnTheHeater(draft, seconds)
  continuePour(draft, seconds)
  runTheTap(draft, seconds)
  steepAllLeaves(draft, seconds)
  continueSoaking(draft, seconds)
  dryThePuddles(draft, seconds)
  draft.state.cloth.wetMl = clothWetMlAfterDrying(draft.state.cloth.wetMl, draft.state.cloth.teaStain, seconds)
  startOrEndBrews(draft)
  draft.state.elapsedSeconds += seconds
  return outcomeOf(draft)
}

function heatVesselOnHeater(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  const vessel = heater.itemIdOnTop === null ? undefined : draft.state.vessels[heater.itemIdOnTop]
  if (!heater.isOn || vessel === undefined) return
  const heaterDefinition = definitionIn(draft.catalog, 'heaters', heater.definitionId)
  const heated = heatLiquid(vessel.liquid, heaterDefinition, seconds)
  vessel.liquid = liquidBoiledAway(heated, heaterDefinition, seconds)
  announceTargetTemperatureOnce(draft, vessel.id, vessel.liquid.temperatureC)
  if (vessel.liquid.volumeMl < heated.volumeMl) noteBoilingAway(draft, vessel.id, heaterDefinition.boilingAwayMlPerSecond, vessel.liquid.volumeMl)
}

function heatOrCoolMetalShells(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  for (const vessel of Object.values(draft.state.vessels)) {
    if (!vesselDefinitionOf(draft, vessel).hasAMetalShell) continue
    const wasTooHotToHold = isTooHotToHold(vessel.shellHeat)
    vessel.shellHeat = shellHeatAfter(vessel.shellHeat, heater.isOn && heater.itemIdOnTop === vessel.id, seconds)
    const isNowTooHotToHold = isTooHotToHold(vessel.shellHeat)
    if (!wasTooHotToHold && isNowTooHotToHold) note(draft, `${vessel.id}'s metal glows too hot to hold, at ${(vessel.shellHeat * 100).toFixed(0)}% of red heat`)
    if (wasTooHotToHold && !isNowTooHotToHold) note(draft, `${vessel.id}'s metal has cooled enough to hold, at ${(vessel.shellHeat * 100).toFixed(0)}% of red heat`)
  }
}

function heatTheClothOnTheHeater(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  const cloth = draft.state.cloth
  if (!heater.isOn || heater.itemIdOnTop !== clothItemId || cloth.charring === 1) return
  if (cloth.wetMl > 0) {
    cloth.wetMl = clothWetMlOnAHotPlate(cloth.wetMl, seconds)
    if (cloth.wetMl === 0) note(draft, 'the cloth on the heater has steamed dry and starts to char')
    return
  }
  cloth.charring = clothCharringOnAHotPlate(cloth.charring, seconds)
  if (cloth.charring === 1) note(draft, 'the cloth on the heater is charred through')
}

function charTheSpoonOnTheHeater(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  const spoon = draft.state.spoon
  if (!heater.isOn || heater.itemIdOnTop !== spoonItemId || spoon.charring === 1) return
  const couldBeSaved = !doesTheSpoonCrumble(spoon.charring)
  spoon.charring = spoonCharringOnAHotPlate(spoon.charring, seconds)
  if (couldBeSaved && doesTheSpoonCrumble(spoon.charring)) note(draft, 'the spoon on the heater burns, and it will crumble when it is taken')
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
  const { placeId, spilledAround } = placeWhereAPourSpills(draft, target)
  spill(draft, placeId, spilledAround, landing.spilledMl, source.liquid.strength)
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

function runTheTap(draft: Draft, seconds: number): void {
  const runningWater = draft.state.sink.runningWater
  const tap = tapOf(draft)
  if (runningWater === null || tap === null) return
  const itemId = draft.state.sink.itemIdInside
  if (itemId === clothItemId) return washTheCloth(draft, runningWater, tap, seconds)
  const vessel = itemId === null ? undefined : draft.state.vessels[itemId]
  if (vessel === undefined) {
    drain(runningWater, tap.flowMlPerSecond * seconds)
    return
  }
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

function drain(runningWater: RunningWaterState, ml: number): void {
  runningWater.drainedMl += ml
  runningWater.drainedSinceOpenedMl += ml
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
}

function washTheCloth(draft: Draft, runningWater: RunningWaterState, tap: TapDefinition, seconds: number): void {
  const cloth = draft.state.cloth
  const stainBefore = cloth.teaStain
  const wetMlBefore = cloth.wetMl
  const charringBefore = cloth.charring
  cloth.teaStain = clothStainAfterWashing(cloth.teaStain, seconds)
  cloth.charring = clothCharringAfterWashing(cloth.charring, seconds)
  cloth.wetMl = clothWetMlUnderTheTap(cloth.wetMl, tap.flowMlPerSecond, seconds)
  runningWater.filledMl += cloth.wetMl - wetMlBefore
  drain(runningWater, tap.flowMlPerSecond * seconds - (cloth.wetMl - wetMlBefore))
  if (stainBefore > 0 && cloth.teaStain === 0) note(draft, `the tea is washed out of the cloth, it holds ${cloth.wetMl.toFixed(1)} ml`)
  if (charringBefore === 0 || cloth.charring > 0) return
  cloth.wasBurntBeforeWashing = true
  note(draft, 'the charring is washed out of the cloth, it is as good as new')
}

function steepAllLeaves(draft: Draft, seconds: number): void {
  for (const vessel of Object.values(draft.state.vessels)) {
    if (vessel.leaves === null || !vessel.leaves.isSteeping) continue
    const steeped = steepLeaves(vessel.liquid, vessel.leaves, definitionIn(draft.catalog, 'teas', vessel.leaves.teaId), seconds)
    vessel.liquid = steeped.liquid
    vessel.leaves = steeped.leaves
  }
}

function continueSoaking(draft: Draft, seconds: number): void {
  const cloth = draft.state.cloth
  if (!cloth.isSoakingThePuddle) return
  const placeId = cloth.location.kind === 'onSurface' ? cloth.location.spot.placeId : null
  const puddle = placeId === null ? undefined : draft.state.puddles[placeId]
  const soakedMl = puddle === undefined ? 0 : mlSoakedUp(puddle.wetMl, cloth.wetMl, seconds)
  if (puddle !== undefined) takeIntoTheCloth(draft, puddle, soakedMl)
  const wetMlLeft = puddle?.wetMl ?? 0
  if (wetMlLeft > 0 && soakedMl > 0) return
  cloth.isSoakingThePuddle = false
  const why = wetMlLeft === 0 ? 'the puddle is gone' : 'the cloth is soaked through'
  note(draft, `the cloth stops soaking because ${why}: it holds ${cloth.wetMl.toFixed(2)} ml, the ${placeId ?? 'place'} is ${wetMlLeft.toFixed(2)} ml wet`)
}
