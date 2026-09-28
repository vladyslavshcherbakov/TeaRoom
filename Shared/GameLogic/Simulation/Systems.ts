import { definitionIn } from '../../Engine/Catalog.ts'
import type { Spot } from '../Definitions/RoomDefinition.ts'
import { isHeating, isTheThermostatWorking, nextHeaterMode } from '../Judgement/HeaterModes.ts'
import { isTheThermostatCallingForHeat } from '../Judgement/ThermostatJudgement.ts'
import { steepLeaves } from '../Chemistry/Brewing.ts'
import { coolingPerSecondOf, coolLiquid, isAtTheBoil, isTooHotToHold, shellHeatAfter } from '../Chemistry/Heat.ts'
import { isEmpty, type Liquid } from '../Chemistry/Liquid.ts'
import { landingOfTheStream, pourFlowMlPerSecond, type StreamLanding } from '../Chemistry/Pouring.ts'
import { clothWetMlAfterDrying, mlSoakedUp } from '../Chemistry/Table.ts'
import { takeIntoTheCloth } from './CleanupCommands.ts'
import type { ClothState, VesselState } from '../State/SessionState.ts'
import { itemIdInTheSink, itemIdOnTheHeater } from '../State/WhereItemsAre.ts'
import { startOrEndBrews } from './Brews.ts'
import { vesselDefinitionOf, type Draft } from './Draft.ts'
import { note, noteDetail } from '../../Engine/Draft.ts'
import { rulesFor } from './ItemKinds.ts'
import { tapOf } from './Reach.ts'
import { drain } from './RunningWater.ts'
import { takeLiquidFrom } from './VesselLiquid.ts'
import { doesAPourDrain, dryThePuddles, spill } from './Puddles.ts'
import { percent } from '../../Engine/Percent.ts'
import type { Schedule } from '../../Engine/Session.ts'

const fullWithinMl = 0.5

export const teaSchedule: Schedule<Draft> = [
  coolVessels,
  letTheThermostatDecide,
  heatWhatSitsOnTheWorkingHeater,
  countTheSecondsOnTheWorkingHeater,
  heatOrCoolMetalShells,
  continuePour,
  runTheTap,
  rememberTheVesselsFilledToTheBrim,
  steepAllLeaves,
  continueSoaking,
  dryThePuddles,
  dryTheCloths,
  startOrEndBrews,
  moveTheClockOn,
]

function dryTheCloths(draft: Draft, seconds: number): void {
  for (const cloth of Object.values(draft.state.cloths)) cloth.wetMl = clothWetMlAfterDrying(cloth.wetMl, cloth.teaStain, seconds)
}

function moveTheClockOn(draft: Draft, seconds: number): void {
  draft.state.elapsedSeconds += seconds
}

function letTheThermostatDecide(draft: Draft): void {
  const heater = draft.state.heater
  if (!isTheThermostatWorking(heater.mode)) return
  const itemId = itemIdOnTheHeater(draft.state)
  const vessel = itemId === null ? undefined : draft.state.vessels[itemId]
  const measuredWaterC = vessel === undefined || isEmpty(vessel.liquid) ? null : vessel.liquid.temperatureC
  const { heatsAgainBelowTheTargetByC } = definitionIn(draft.catalog, 'heaters', heater.definitionId).thermostat
  const shouldHeat = isTheThermostatCallingForHeat(isHeating(heater.mode), measuredWaterC, heater.thermostatTargetC, heatsAgainBelowTheTargetByC)
  if (shouldHeat === isHeating(heater.mode)) return
  heater.mode = nextHeaterMode(heater.mode, { kind: 'thermostatDecided', callsForHeat: shouldHeat })
  const measured = measuredWaterC === null ? `no water on the heater to measure, ${itemId ?? 'nothing'} on it` : `${itemId} at ${measuredWaterC.toFixed(1)} °C`
  note(draft, `thermostat ${shouldHeat ? 'starts heating' : 'stops heating'}: ${measured}, target ${heater.thermostatTargetC} °C`)
}

function rememberTheVesselsFilledToTheBrim(draft: Draft): void {
  for (const vessel of Object.values(draft.state.vessels)) {
    if (vessel.hasOnlyBoiledDownSinceFull || vessel.liquid.volumeMl < vesselDefinitionOf(draft, vessel).capacityMl - fullWithinMl) continue
    vessel.hasOnlyBoiledDownSinceFull = true
    note(draft, `${vessel.id} is filled to the brim with ${vessel.liquid.volumeMl.toFixed(1)} ml`)
  }
}

function heatWhatSitsOnTheWorkingHeater(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  const itemId = itemIdOnTheHeater(draft.state)
  if (!isHeating(heater.mode) || itemId === null) return
  rulesFor(draft.state, itemId)?.heatOnTheWorkingHeater(draft, itemId, seconds)
}

function countTheSecondsOnTheWorkingHeater(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  const itemId = itemIdOnTheHeater(draft.state)
  if (!isHeating(heater.mode)) return
  heater.secondsHeating += seconds
  if (itemId === null || rulesFor(draft.state, itemId)?.isMadeForTheHeater(draft, itemId) !== true) heater.secondsWasted += seconds
  if (itemId !== null) heater.secondsHeatedByItemId[itemId] = (heater.secondsHeatedByItemId[itemId] ?? 0) + seconds
}

function heatOrCoolMetalShells(draft: Draft, seconds: number): void {
  const heater = draft.state.heater
  for (const vessel of Object.values(draft.state.vessels)) {
    if (!vesselDefinitionOf(draft, vessel).hasAMetalShell) continue
    const wasTooHotToHold = isTooHotToHold(vessel.shellHeat)
    vessel.shellHeat = shellHeatAfter(vessel.shellHeat, isHeating(heater.mode) && itemIdOnTheHeater(draft.state) === vessel.id, seconds)
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
  const streamMlPerSecond = pourFlowMlPerSecond(vesselDefinitionOf(draft, source), pour.tiltDegrees)
  const stream = takeLiquidFrom(source, streamMlPerSecond * seconds)
  const landing = landingOfTheStream(stream, streamMlPerSecond, target === undefined ? null : { liquid: target.liquid, definition: vesselDefinitionOf(draft, target) }, pour.streamOnTargetFraction)
  if (target !== undefined && landing.target !== null) target.liquid = landing.target
  pour.pouredMl += landing.landedMl
  pour.spilledMl += landing.spilledMl
  spillWhatMissedAndOverflowed(draft, pour.missedStreamLandsAt, source, target, landing, stream)
  if (target !== undefined && landing.overflowed.volumeMl > 0 && !pour.hasOverflowed) {
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
  const itemId = itemIdInTheSink(draft.state)
  const runTheTapOnto = itemId === null ? null : (rulesFor(draft.state, itemId)?.runTheTapOnto ?? null)
  if (itemId === null || runTheTapOnto === null) {
    drain(runningWater, tap.flowMlPerSecond * seconds)
    return
  }
  runTheTapOnto(draft, itemId, runningWater, tap, seconds)
}

function spillWhatMissedAndOverflowed(draft: Draft, missedStreamLandsAt: Spot | null, source: VesselState, target: VesselState | undefined, landing: StreamLanding, stream: Liquid): void {
  if (doesAPourDrain(source, target)) return noteDetail(draft, `${landing.spilledMl.toFixed(2)} ml of the pour from ${source.id} ran down the drain`)
  const aroundTheTarget = target?.location.kind === 'onSurface' ? target.location.spot : missedStreamLandsAt
  spillAt(draft, missedStreamLandsAt, landing.missedMl, stream, source.id)
  spillAt(draft, aroundTheTarget, landing.splashedMl, stream, source.id)
  spillAt(draft, aroundTheTarget, landing.overflowed.volumeMl, landing.overflowed, source.id)
}

function spillAt(draft: Draft, spot: Spot | null, spilledMl: number, spilled: Liquid, sourceId: string): void {
  if (spilledMl <= 0) return
  if (spot === null) return note(draft, `${spilledMl.toFixed(2)} ml of the pour from ${sourceId} falls where no top is and is lost`)
  spill(draft, spot, spilledMl, spilled)
}

function steepAllLeaves(draft: Draft, seconds: number): void {
  for (const vessel of Object.values(draft.state.vessels)) {
    if (vessel.leaves === null || !vessel.leaves.isSteeping) continue
    stirWithTheBoilIfItBoils(draft, vessel)
    const steeped = steepLeaves(vessel.liquid, vessel.leaves, (teaId) => definitionIn(draft.catalog, 'teas', teaId), seconds)
    vessel.liquid = steeped.liquid
    vessel.leaves = steeped.leaves
  }
}

function stirWithTheBoilIfItBoils(draft: Draft, vessel: VesselState): void {
  if (vessel.leaves === null) return
  const heater = draft.state.heater
  const isStirred = isHeating(heater.mode) && itemIdOnTheHeater(draft.state) === vessel.id && isAtTheBoil(vessel.liquid)
  if (isStirred === vessel.leaves.isStirredByTheBoil) return
  vessel.leaves = { ...vessel.leaves, isStirredByTheBoil: isStirred }
  note(draft, isStirred ? `the boil in ${vessel.id} stirs its leaves, and they brew twice as fast` : `the leaves in ${vessel.id} settle as the boil stops`)
}

function continueSoaking(draft: Draft, seconds: number): void {
  for (const cloth of Object.values(draft.state.cloths)) continueSoakingWith(draft, cloth, seconds)
}

function continueSoakingWith(draft: Draft, cloth: ClothState, seconds: number): void {
  if (cloth.soakingPuddleId === null) return
  const puddleId = cloth.soakingPuddleId
  const puddle = draft.state.puddles[puddleId]
  const soakedMl = puddle === undefined ? 0 : takeIntoTheCloth(cloth, puddle, mlSoakedUp(puddle.wetMl, seconds))
  const wetMlLeft = puddle?.wetMl ?? 0
  if (wetMlLeft > 0 && soakedMl > 0) return
  cloth.soakingPuddleId = null
  const why = wetMlLeft === 0 ? `${puddleId} is gone` : `${cloth.id} is soaked through`
  note(draft, `${cloth.id} stops soaking because ${why}: it holds ${cloth.wetMl.toFixed(2)} ml, ${puddleId} holds ${wetMlLeft.toFixed(2)} ml`)
}
