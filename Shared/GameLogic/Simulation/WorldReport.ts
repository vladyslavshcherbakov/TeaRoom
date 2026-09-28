import { totalLeafGrams } from '../Chemistry/Brewing.ts'
import { isEmpty } from '../Chemistry/Liquid.ts'
import type { Catalog } from '../Definitions/Catalog.ts'
import type { ClothState, SessionState, VesselState } from '../State/SessionState.ts'
import type { TeaEvent } from './TeaEvent.ts'
import { describeTheLeaves, describeTheSteepingTimes, describeTheTeasOf, teasOfTheLeaves, vesselDefinitionOf, type Draft } from './Draft.ts'
import { describeTheHeatersControl, isTheHeaterInUse } from '../Judgement/HeaterModes.ts'
import type { WorldReport } from '../../Engine/Report.ts'
import { percent } from '../../Engine/Percent.ts'
import { itemIdInTheSink, itemIdOnTheHeater, spoonItemId } from '../State/WhereItemsAre.ts'
import { whereTheItemIs } from './Reach.ts'

const smallestReportedChange = 1e-4

export const teaReport: WorldReport<SessionState, Catalog, TeaEvent> = {
  everySeconds: 5,
  secondsAhead: 1,
  heading: 'the room',
  headingAfterAbsence: 'the room on return',
  stillLine: 'the room is still',
  reporters: [
    (draft, ahead) => Object.values(draft.state.vessels).flatMap((vessel) => vesselLines(draft, vessel, ahead.vessels[vessel.id])),
    (draft) => heaterLines(draft),
    (draft) => tapLines(draft.state),
    (draft, ahead) => clothLines(draft.state, ahead),
    (draft, ahead) => spoonLines(draft.state, ahead),
    (draft, ahead) => puddleLines(draft.state, ahead),
  ],
}

function vesselLines(draft: Draft, vessel: VesselState, ahead: VesselState | undefined): string[] {
  if (ahead === undefined) return []
  const liquid = vessel.liquid
  const next = ahead.liquid
  const temperatureRate = next.temperatureC - liquid.temperatureC
  const volumeRate = next.volumeMl - liquid.volumeMl
  const strengthRate = next.strength - liquid.strength
  const bitternessRate = next.bitterness - liquid.bitterness
  const shellRate = ahead.shellHeat - vessel.shellHeat
  const leavesRate = leafGramsIn(ahead) - leafGramsIn(vessel)
  const isEmptyNowAndAhead = isEmpty(liquid) && isEmpty(next)
  const ratesOfTheLiquid = isEmptyNowAndAhead ? [] : [temperatureRate, strengthRate, bitternessRate]
  const isChanging = [volumeRate, shellRate, leavesRate, ...ratesOfTheLiquid].some((rate) => Math.abs(rate) > smallestReportedChange)
  if (!isChanging) return []
  const definition = vesselDefinitionOf(draft, vessel)
  const lid = definition.lid === null ? 'no lid' : vessel.isLidOpen ? 'lid open' : 'lid closed'
  const leaves = vessel.leaves === null ? 'no leaves' : `${leafGramsIn(vessel).toFixed(2)} g${rateIfChanging(leavesRate, 3, ' g/s')} of ${teasOfTheLeaves(vessel.leaves.gramsByTeaId)}${vessel.leaves.isSteeping ? ` steeping for ${describeTheSteepingTimes(vessel.leaves, 0)}${vessel.leaves.isStirredByTheBoil ? ', stirred by the boil' : ''}` : ', dry'}`
  const shell = definition.hasAMetalShell ? `, its metal at ${percent(vessel.shellHeat)} of red heat${percentRateIfChanging(shellRate)}` : ''
  const contents =
    isEmptyNowAndAhead
      ? 'empty'
      : `${liquid.volumeMl.toFixed(1)} ml${rateIfChanging(volumeRate, 2, ' ml/s')} at ${liquid.temperatureC.toFixed(1)} °C${rateIfChanging(temperatureRate, 3, ' °C/s')}, ` +
        `strength ${liquid.strength.toFixed(1)}${rateIfChanging(strengthRate, 3, '/s')}${describeTheTeasOf(liquid)}, bitterness ${liquid.bitterness.toFixed(1)}${rateIfChanging(bitternessRate, 3, '/s')}`
  return [`${vessel.id} ${whereTheItemIs(draft.state, vessel.id)}, ${lid}: ${contents}, ${leaves}${shell}`]
}

function heaterLines(draft: Draft): string[] {
  const heater = draft.state.heater
  if (!isTheHeaterInUse(heater.mode)) return []
  const onSeconds = draft.state.elapsedSeconds - heater.switchedOnAtSeconds
  const control = describeTheHeatersControl(heater.mode, heater.thermostatTargetC)
  return [`the heater has been in use for ${onSeconds.toFixed(0)} s, ${control}, with ${itemIdOnTheHeater(draft.state) ?? 'nothing'} on it`]
}

function tapLines(state: SessionState): string[] {
  const runningWater = state.sink.runningWater
  if (runningWater === null) return []
  const openSeconds = state.elapsedSeconds - runningWater.openedAtSeconds
  return [
    `the tap has been open for ${openSeconds.toFixed(0)} s over ${itemIdInTheSink(state) ?? 'the empty sink'}: ` +
      `${runningWater.drainedSinceOpenedMl.toFixed(0)} ml down the drain since it opened, ${runningWater.filledMl.toFixed(1)} ml into what stands in the sink`,
  ]
}

function clothLines(now: SessionState, ahead: SessionState): string[] {
  return Object.values(now.cloths).flatMap((cloth) => {
    const clothAhead = ahead.cloths[cloth.id]
    return clothAhead === undefined ? [] : clothLinesFor(now, cloth, clothAhead)
  })
}

function clothLinesFor(now: SessionState, cloth: ClothState, clothAhead: ClothState): string[] {
  const wetRate = clothAhead.wetMl - cloth.wetMl
  const stainRate = clothAhead.teaStain - cloth.teaStain
  const charringRate = clothAhead.charring - cloth.charring
  if (![wetRate, stainRate, charringRate].some((rate) => Math.abs(rate) > smallestReportedChange)) return []
  return [
    `${cloth.id} ${whereTheItemIs(now, cloth.id)}: holds ${cloth.wetMl.toFixed(2)} ml${rateIfChanging(wetRate, 3, ' ml/s')}, ` +
      `tea stain ${percent(cloth.teaStain)}${percentRateIfChanging(stainRate)}, charring ${percent(cloth.charring)}${percentRateIfChanging(charringRate)}`,
  ]
}

function spoonLines(now: SessionState, ahead: SessionState): string[] {
  const charringRate = ahead.spoon.charring - now.spoon.charring
  if (Math.abs(charringRate) <= smallestReportedChange) return []
  return [`the spoon ${whereTheItemIs(now, spoonItemId)} with ${describeTheLeaves(now.spoon.gramsByTeaId)} on it: charring ${percent(now.spoon.charring)}${percentRateIfChanging(charringRate)}`]
}

function puddleLines(now: SessionState, ahead: SessionState): string[] {
  return Object.entries(now.puddles).flatMap(([puddleId, puddle]) => {
    const wetRate = (ahead.puddles[puddleId]?.wetMl ?? 0) - puddle.wetMl
    const temperatureRate = (ahead.puddles[puddleId]?.temperatureC ?? puddle.temperatureC) - puddle.temperatureC
    if (Math.abs(wetRate) <= smallestReportedChange) return []
    return [`${puddleId} on the ${puddle.centre.placeId} at (${puddle.centre.x.toFixed(2)}, ${puddle.centre.z.toFixed(2)}): ${puddle.wetMl.toFixed(2)} ml${rateIfChanging(wetRate, 3, ' ml/s')} of strength ${puddle.strength.toFixed(1)} at ${puddle.temperatureC.toFixed(1)} °C${rateIfChanging(temperatureRate, 2, ' °C/s')}`]
  })
}


function leafGramsIn(vessel: VesselState): number {
  return vessel.leaves === null ? 0 : totalLeafGrams(vessel.leaves.gramsByTeaId)
}

function rateIfChanging(rate: number, digits: number, unit: string): string {
  return Math.abs(rate) > smallestReportedChange ? ` (${signed(rate, digits)}${unit})` : ''
}

function percentRateIfChanging(share: number): string {
  return Math.abs(share) > smallestReportedChange ? ` (${signedPercent(share)}/s)` : ''
}

function signed(value: number, digits: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

function signedPercent(share: number): string {
  return `${share >= 0 ? '+' : ''}${(share * 100).toFixed(1)}%`
}
