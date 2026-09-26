import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import { isTheThermostatCallingForHeat } from '../Judgement/ThermostatJudgement.ts'
import { steepLeaves } from '../Physics/Brewing.ts'
import { coolingPerSecondOf, coolLiquid, isAtTheBoil, isTooHotToHold, shellHeatAfter } from '../Physics/Heat.ts'
import { isEmpty } from '../Physics/Liquid.ts'
import { pourStream, type StreamLanding } from '../Physics/Pouring.ts'
import { clothWetMlAfterDrying, mlSoakedUp } from '../Physics/Table.ts'
import { takeIntoTheCloth } from './CleanupCommands.ts'
import type { ClothState, SessionState, VesselState } from '../State/SessionState.ts'
import { startOrEndBrews } from './Brews.ts'
import { note, outcomeOf, startDraft, vesselDefinitionOf, type Draft, type Outcome } from './Draft.ts'
import { switchTheHeaterOffAtItsTarget } from './HeatingCommands.ts'
import { rulesFor } from './ItemKinds.ts'
import { tapOf } from './Reach.ts'
import { drain } from './RunningWater.ts'
import { dryThePuddles, placeWhereAPourSpills, spill } from './Puddles.ts'
import { percent } from './Percent.ts'

export function simulateStep(state: SessionState, seconds: number, catalog: Catalog): Outcome {
  const draft = startDraft(state, catalog)
  stepTheWorld(draft, seconds)
  return outcomeOf(draft)
}

export function stepTheWorld(draft: Draft, seconds: number): void {
  if (draft.state.phase === 'ended') return
  coolVessels(draft, seconds)
  letTheThermostatDecide(draft)
  stopTheHeaterAtItsTargetIfItShould(draft)
  heatWhatSitsOnTheWorkingHeater(draft, seconds)
  countTheSecondsOnTheWorkingHeater(draft, seconds)
  heatOrCoolMetalShells(draft, seconds)
  continuePour(draft, seconds)
  runTheTap(draft, seconds)
  steepAllLeaves(draft, seconds)
  continueSoaking(draft, seconds)
  dryThePuddles(draft, seconds)
  for (const cloth of Object.values(draft.state.cloths)) cloth.wetMl = clothWetMlAfterDrying(cloth.wetMl, cloth.teaStain, seconds)
  startOrEndBrews(draft)
  draft.state.elapsedSeconds += seconds
}

function stopTheHeaterAtItsTargetIfItShould(draft: Draft): void {
  const heater = draft.state.heater
  if (!heater.isOn || heater.thermostat.isOn || !heater.stopsAtTheThermostatsTarget) return
  const itemId = heater.itemIdOnTop
  const vessel = itemId === null ? undefined : draft.state.vessels[itemId]
  if (vessel === undefined || isEmpty(vessel.liquid) || vessel.liquid.temperatureC < heater.thermostat.targetC) return
  switchTheHeaterOffAtItsTarget(draft)
}

function letTheThermostatDecide(draft: Draft): void {
  const heater = draft.state.heater
  if (!heater.thermostat.isOn) return
  const itemId = heater.itemIdOnTop
  const vessel = itemId === null ? undefined : draft.state.vessels[itemId]
  const measuredWaterC = vessel === undefined || isEmpty(vessel.liquid) ? null : vessel.liquid.temperatureC
  const { heatsAgainBelowTheTargetByC } = definitionIn(draft.catalog, 'heaters', heater.definitionId).thermostat
  const shouldHeat = isTheThermostatCallingForHeat(heater.isOn, measuredWaterC, heater.thermostat.targetC, heatsAgainBelowTheTargetByC)
  if (shouldHeat === heater.isOn) return
  heater.isOn = shouldHeat
  const measured = measuredWaterC === null ? `no water on the heater to measure, ${itemId ?? 'nothing'} on it` : `${itemId} at ${measuredWaterC.toFixed(1)} °C`
  note(draft, `thermostat ${shouldHeat ? 'starts heating' : 'stops heating'}: ${measured}, target ${heater.thermostat.targetC} °C`)
}

function heatWhatSitsOnTheWorkingHeater(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  const itemId = heater.itemIdOnTop
  if (!heater.isOn || itemId === null) return
  rulesFor(draft.state, itemId)?.heatOnTheWorkingHeater(draft, itemId, seconds)
}

function countTheSecondsOnTheWorkingHeater(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  const itemId = heater.itemIdOnTop
  if (!heater.isOn) return
  heater.secondsHeating += seconds
  if (itemId === null || rulesFor(draft.state, itemId)?.isMadeForTheHeater(draft, itemId) !== true) heater.secondsWasted += seconds
  if (itemId !== null) heater.secondsHeatedByItemId[itemId] = (heater.secondsHeatedByItemId[itemId] ?? 0) + seconds
}

function heatOrCoolMetalShells(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  for (const vessel of Object.values(draft.state.vessels)) {
    if (!vesselDefinitionOf(draft, vessel).hasAMetalShell) continue
    const wasTooHotToHold = isTooHotToHold(vessel.shellHeat)
    vessel.shellHeat = shellHeatAfter(vessel.shellHeat, heater.isOn && heater.itemIdOnTop === vessel.id, seconds)
    const isNowTooHotToHold = isTooHotToHold(vessel.shellHeat)
    if (!wasTooHotToHold && isNowTooHotToHold) glowTooHotToHold(draft, vessel)
    if (wasTooHotToHold && !isNowTooHotToHold) note(draft, `${vessel.id}'s metal has cooled enough to hold, at ${percent(vessel.shellHeat)} of red heat`)
  }
}

function glowTooHotToHold(draft: Draft, vessel: VesselState): void {
  note(draft, `${vessel.id}'s metal glows too hot to hold, at ${percent(vessel.shellHeat)} of red heat`)
  draft.events.push({ type: 'metalGlowsTooHotToHold', vesselId: vessel.id })
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
  spillWhatMissedAndOverflowed(draft, pour.missedStreamLandsAt, target, landing, source.liquid.strength)
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
  const runTheTapOnto = itemId === null ? null : (rulesFor(draft.state, itemId)?.runTheTapOnto ?? null)
  if (itemId === null || runTheTapOnto === null) {
    drain(runningWater, tap.flowMlPerSecond * seconds)
    return
  }
  runTheTapOnto(draft, itemId, runningWater, tap, seconds)
}

function spillWhatMissedAndOverflowed(draft: Draft, missedStreamLandsAt: Spot | null, target: VesselState | undefined, landing: StreamLanding, strength: number): void {
  const aroundTheTarget = placeWhereAPourSpills(draft, target)
  if (missedStreamLandsAt === null) return spill(draft, aroundTheTarget.placeId, aroundTheTarget.spilledAround, landing.spilledMl, strength)
  spill(draft, missedStreamLandsAt.placeId, missedStreamLandsAt, landing.spilledMl - landing.overflowedMl, strength)
  spill(draft, aroundTheTarget.placeId, aroundTheTarget.spilledAround, landing.overflowedMl, strength)
}

function steepAllLeaves(draft: Draft, seconds: number): void {
  for (const vessel of Object.values(draft.state.vessels)) {
    if (vessel.leaves === null || !vessel.leaves.isSteeping) continue
    stirWithTheBoilIfItBoils(draft, vessel)
    const steeped = steepLeaves(vessel.liquid, vessel.leaves, definitionIn(draft.catalog, 'teas', vessel.leaves.teaId), seconds)
    vessel.liquid = steeped.liquid
    vessel.leaves = steeped.leaves
  }
}

function stirWithTheBoilIfItBoils(draft: Draft, vessel: VesselState): void {
  if (vessel.leaves === null) return
  const heater = draft.state.heater
  const isStirred = heater.isOn && heater.itemIdOnTop === vessel.id && isAtTheBoil(vessel.liquid)
  if (isStirred === vessel.leaves.isStirredByTheBoil) return
  vessel.leaves = { ...vessel.leaves, isStirredByTheBoil: isStirred }
  note(draft, isStirred ? `the boil in ${vessel.id} stirs its leaves, and they brew twice as fast` : `the leaves in ${vessel.id} settle as the boil stops`)
}

function continueSoaking(draft: Draft, seconds: number): void {
  for (const cloth of Object.values(draft.state.cloths)) continueSoakingWith(draft, cloth, seconds)
}

function continueSoakingWith(draft: Draft, cloth: ClothState, seconds: number): void {
  if (!cloth.isSoakingThePuddle) return
  const placeId = cloth.location.kind === 'onSurface' ? cloth.location.spot.placeId : null
  const puddle = placeId === null ? undefined : draft.state.puddles[placeId]
  const soakedMl = puddle === undefined ? 0 : mlSoakedUp(puddle.wetMl, cloth.wetMl, seconds)
  if (puddle !== undefined) takeIntoTheCloth(cloth, puddle, soakedMl)
  const wetMlLeft = puddle?.wetMl ?? 0
  if (wetMlLeft > 0 && soakedMl > 0) return
  cloth.isSoakingThePuddle = false
  const why = wetMlLeft === 0 ? 'the puddle is gone' : `${cloth.id} is soaked through`
  note(draft, `${cloth.id} stops soaking because ${why}: it holds ${cloth.wetMl.toFixed(2)} ml, the ${placeId ?? 'place'} is ${wetMlLeft.toFixed(2)} ml wet`)
}
