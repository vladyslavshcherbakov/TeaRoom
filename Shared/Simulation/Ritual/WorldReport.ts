import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import { kilowattHoursUsed } from '../Physics/Heat.ts'
import { isEmpty } from '../Physics/Liquid.ts'
import type { ClothState, ItemLocation, SessionState, VesselState } from '../State/SessionState.ts'
import { noteDetail, outcomeOf, startDraft, vesselDefinitionOf, type Draft, type Outcome } from './Draft.ts'
import { isTheHeaterInUse } from './HeatingCommands.ts'
import { stepTheWorld } from './SimulationStep.ts'
import { percent } from './Percent.ts'
import { spoonItemId, whereIs } from './Reach.ts'

export const worldReportSeconds = 5

const secondsTheRatesLookAhead = 1
const smallestReportedChange = 1e-4

export function isTimeToReportTheWorld(secondsBefore: number, secondsAfter: number): boolean {
  return Math.floor(secondsBefore / worldReportSeconds) !== Math.floor(secondsAfter / worldReportSeconds)
}

export function worldReportOf(state: SessionState, catalog: Catalog): Outcome {
  const draft = startDraft(state, catalog)
  reportTheWorld(draft, 'the room')
  return outcomeOf(draft)
}

export function reportTheWorld(draft: Draft, heading: string): void {
  const aheadDraft = startDraft(draft.state, draft.catalog)
  stepTheWorld(aheadDraft, secondsTheRatesLookAhead)
  const now = draft.state
  const ahead = aheadDraft.state
  const lines = [
    ...Object.values(now.vessels).flatMap((vessel) => vesselLines(draft, vessel, ahead.vessels[vessel.id])),
    ...heaterLines(draft),
    ...tapLines(now),
    ...clothLines(now, ahead),
    ...spoonLines(now, ahead),
    ...puddleLines(now, ahead),
  ]
  if (lines.length === 0) return noteDetail(draft, `${heading}: the room is still`)
  for (const line of lines) noteDetail(draft, `${heading}: ${line}`)
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
  const isChanging = [temperatureRate, volumeRate, strengthRate, bitternessRate, shellRate].some((rate) => Math.abs(rate) > smallestReportedChange)
  if (!isChanging) return []
  const definition = vesselDefinitionOf(draft, vessel)
  const lid = definition.lid === null ? 'no lid' : vessel.isLidOpen ? 'lid open' : 'lid closed'
  const leaves = vessel.leaves === null ? 'no leaves' : `${vessel.leaves.grams.toFixed(2)} g of ${vessel.leaves.teaId}${vessel.leaves.isSteeping ? ` steeping for ${vessel.leaves.steepedSeconds.toFixed(0)} s${vessel.leaves.isStirredByTheBoil ? ', stirred by the boil' : ''}` : ', dry'}`
  const shell = definition.hasAMetalShell ? `, its metal at ${percent(vessel.shellHeat)} of red heat (${signedPercent(shellRate)}/s)` : ''
  const contents =
    isEmpty(liquid) && isEmpty(next)
      ? 'empty'
      : `${liquid.volumeMl.toFixed(1)} ml (${signed(volumeRate, 2)} ml/s) at ${liquid.temperatureC.toFixed(1)} °C (${signed(temperatureRate, 3)} °C/s), ` +
        `strength ${liquid.strength.toFixed(1)} (${signed(strengthRate, 3)}/s), bitterness ${liquid.bitterness.toFixed(1)} (${signed(bitternessRate, 3)}/s)`
  return [`${vessel.id} ${where(draft.state, vessel.id, vessel.location)}, ${lid}: ${contents}, ${leaves}${shell}`]
}

function heaterLines(draft: Draft): string[] {
  const heater = draft.state.heater
  if (!isTheHeaterInUse(heater)) return []
  const onSeconds = draft.state.elapsedSeconds - heater.switchedOnAtSeconds
  const kilowattHours = kilowattHoursUsed(definitionIn(draft.catalog, 'heaters', heater.definitionId), heater.secondsHeating)
  const control = heater.thermostat.isOn ? `its thermostat at ${heater.thermostat.targetC} °C, ${heater.isOn ? 'heating' : 'waiting'}` : 'by hand'
  return [`the heater has been in use for ${onSeconds.toFixed(0)} s, ${control}, heated ${heater.secondsHeating.toFixed(0)} s and used ${kilowattHours.toFixed(4)} kWh, ${heater.secondsWasted.toFixed(0)} s of it wasted, with ${heater.itemIdOnTop ?? 'nothing'} on it`]
}

function tapLines(state: SessionState): string[] {
  const runningWater = state.sink.runningWater
  if (runningWater === null) return []
  const openSeconds = state.elapsedSeconds - runningWater.openedAtSeconds
  return [
    `the tap has been open for ${openSeconds.toFixed(0)} s over ${state.sink.itemIdInside ?? 'the empty sink'}: ` +
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
    `${cloth.id} ${where(now, cloth.id, cloth.location)}: holds ${cloth.wetMl.toFixed(2)} ml (${signed(wetRate, 3)} ml/s), ` +
      `tea stain ${percent(cloth.teaStain)} (${signedPercent(stainRate)}/s), charring ${percent(cloth.charring)} (${signedPercent(charringRate)}/s)`,
  ]
}

function spoonLines(now: SessionState, ahead: SessionState): string[] {
  const charringRate = ahead.spoon.charring - now.spoon.charring
  if (Math.abs(charringRate) <= smallestReportedChange) return []
  return [`the spoon ${where(now, spoonItemId, now.spoon.location)} with ${now.spoon.grams.toFixed(2)} g on it: charring ${percent(now.spoon.charring)} (${signedPercent(charringRate)}/s)`]
}

function puddleLines(now: SessionState, ahead: SessionState): string[] {
  return Object.entries(now.puddles).flatMap(([placeId, puddle]) => {
    const wetRate = (ahead.puddles[placeId]?.wetMl ?? 0) - puddle.wetMl
    const temperatureRate = (ahead.puddles[placeId]?.temperatureC ?? puddle.temperatureC) - puddle.temperatureC
    if (Math.abs(wetRate) <= smallestReportedChange) return []
    return [`the puddle on the ${placeId}: ${puddle.wetMl.toFixed(2)} ml (${signed(wetRate, 3)} ml/s) of strength ${puddle.strength.toFixed(1)} at ${puddle.temperatureC.toFixed(1)} °C (${signed(temperatureRate, 2)} °C/s)`]
  })
}

function where(state: SessionState, itemId: string, location: ItemLocation): string {
  if (state.sink.itemIdInside === itemId) return 'in the sink'
  if (state.heater.itemIdOnTop === itemId) return `on the ${state.heater.isOn ? 'working' : 'cold'} heater`
  return whereIs(location)
}

function signed(value: number, digits: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

function signedPercent(share: number): string {
  return `${share >= 0 ? '+' : ''}${(share * 100).toFixed(1)}%`
}
