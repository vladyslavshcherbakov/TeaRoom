import { blendOf, clampedToShare, extremeStrengthFrom, highBitternessFrom, isClosedAgainstPouring, isOnAWorkingHeater, isSteamingInsteadOfCharring, isThePourRunningOverItsTarget, isThePourStreamRunning, itemIdInTheSink, definitionIn, howAClothChars, howTheSpoonChars, isEmpty, isHeating, isTheThermostatWorking, itemIdOnTheHeater, shareOfWhatTheClothHolds, judgeTaste, puddleRadiusMetres, spoonItemId, totalLeafGrams, type Catalog, type ClothState, type DeepReadonly, type Liquid, type SessionState, type TeaInABlend, type VesselDefinition, type VesselState } from '../../../Shared/GameLogic/GameLogic.ts'
import type { BrewStage, Heating, LooseLeavesView, PourStreamView, SoakedLeavesView, SteamLevel, SurfaceMotion, TapStreamView, VesselView, WorldViewState } from './WorldViewState.ts'
import { teaLookFor } from './TeaLooks.ts'

const waterColour = '#c9e3f0'
const overbrewedColour = '#2b1a10'
const tarColour = '#130b06'
const strengthOfPureTar = 99
const darkestShareOfOverbrewedColour = 0.5
const steamWispsFromC = 60
const steamVisibleFromC = 75
const steamBillowingFromC = 85
const shimmeringFromC = 40
const simmeringFromC = 55
const boilingFromC = 95
const whistlingFromC = 90
const soakedLeavesShownPerGram = 2
export const mostSoakedLeavesShown = 12
const leavesSeepShareByBrewStage: Readonly<Record<BrewStage, number>> = { water: 1, pale: 0.8, good: 0.5, rich: 0.2, heavy: 0, overbrewed: 0, tar: 0 }
const degreesOfDifferenceThatKeepAStreamInOneLayer = 15
const liquorOpacityByBrewStage: Readonly<Record<BrewStage, number>> = { water: 0.5, pale: 0.6, good: 0.68, rich: 0.8, heavy: 0.9, overbrewed: 0.95, tar: 1 }
const smokingFromCharring = 0.035
const scorchingFromCharring = 0.2
export const smoulderingFromCharring = 0.5

export function worldViewState(state: DeepReadonly<SessionState>, catalog: Catalog): WorldViewState {
  const vessels: Record<string, VesselView> = {}
  const heatedVesselId = isHeating(state.heater.mode) ? itemIdOnTheHeater(state) : null
  for (const vessel of Object.values(state.vessels)) {
    vessels[vessel.id] = vesselView(vessel, definitionIn(catalog, 'vessels', vessel.definitionId), blendOf(vessel.liquid, catalog), vessel.id === heatedVesselId)
  }
  return {
    vessels,
    isHeaterOn: isHeating(state.heater.mode),
    thermostat: { targetC: state.heater.thermostatTargetC, isOn: isTheThermostatWorking(state.heater.mode) },
    looseLeavesByItem: looseLeavesByItemIn(state, catalog),
    cloths: Object.fromEntries(Object.values(state.cloths).map((cloth) => [cloth.id, { wetShare: shareOfWhatTheClothHolds(cloth.wetMl), teaStain: cloth.teaStain }])),
    charringByItem: {
      ...Object.fromEntries(Object.values(state.cloths).map((cloth) => [cloth.id, { charring: cloth.charring, charredShare: cloth.charring, heating: clothHeatingOf(state, cloth) }])),
      [spoonItemId]: { charring: state.spoon.charring, charredShare: clampedToShare(state.spoon.charring / howTheSpoonChars.burnsFromCharring), heating: spoonHeatingOf(state) },
    },
    puddles: Object.entries(state.puddles).map(([puddleId, puddle]) => ({ puddleId, placeId: puddle.centre.placeId, centre: { x: puddle.centre.x, y: puddle.centre.y, z: puddle.centre.z }, radiusMetres: puddleRadiusMetres(puddle.wetMl) })),
    pourStream: pourStreamOf(state, vessels),
    tapStream: tapStreamOf(state),
  }
}

export function warmthOfAStream(streamCelsius: number | null, liquidCelsius: number | null): number {
  if (streamCelsius === null || liquidCelsius === null) return 0
  return Math.min(1, Math.max(-1, (streamCelsius - liquidCelsius) / degreesOfDifferenceThatKeepAStreamInOneLayer))
}

function pourStreamOf(state: DeepReadonly<SessionState>, vessels: Readonly<Record<string, VesselView>>): PourStreamView | null {
  const pour = state.pour
  if (pour === null || !isThePourStreamRunning(pour)) return null
  const source = vessels[pour.sourceId]
  const target = pour.targetId === null ? undefined : vessels[pour.targetId]
  return {
    sourceId: pour.sourceId,
    targetId: pour.targetId,
    colour: source?.liquorColour ?? waterColour,
    onTargetShare: pour.streamOnTargetFraction,
    landing: pour.streamOnTargetFraction > 0 ? { kind: 'onTheTarget' } : pour.missedStreamLandsAt === null ? { kind: 'onTheFloor' } : { kind: 'atAHeight', heightMetres: pour.missedStreamLandsAt.y },
    warmth: warmthOfAStream(source?.waterTemperatureC ?? null, target?.waterTemperatureC ?? null),
    isOverflowingItsTarget: isThePourRunningOverItsTarget(pour),
  }
}

function tapStreamOf(state: DeepReadonly<SessionState>): TapStreamView | null {
  const runningWater = state.sink.runningWater
  if (runningWater === null) return null
  const itemIdUnderIt = itemIdInTheSink(state)
  if (itemIdUnderIt === null) return { itemIdUnderIt, landing: 'onTheSinkFloor', isOverflowingTheItem: false }
  return { itemIdUnderIt, landing: runningWater.isRunningOverTheLid ? 'onTheLid' : 'intoTheItem', isOverflowingTheItem: runningWater.hasOverflowed && !runningWater.isRunningOverTheLid }
}

function looseLeavesByItemIn(state: DeepReadonly<SessionState>, catalog: Catalog): Record<string, LooseLeavesView> {
  const looseLeavesByItem: Record<string, LooseLeavesView> = { [spoonItemId]: looseLeavesOf(state.spoon.gramsByTeaId, state.spoon.capacityGrams) }
  for (const { id, teaStock } of definitionIn(catalog, 'rooms', state.roomId).vessels) {
    if (teaStock !== null) looseLeavesByItem[id] = looseLeavesOf(state.vessels[id]?.leaves?.gramsByTeaId ?? {}, teaStock.grams)
  }
  return looseLeavesByItem
}

function looseLeavesOf(gramsByTeaId: Readonly<Record<string, number>>, gramsWhenFull: number): LooseLeavesView {
  return { teaId: teaWithTheMostLeaves(gramsByTeaId), fillShare: share(totalLeafGrams(gramsByTeaId), gramsWhenFull) }
}

function teaWithTheMostLeaves(gramsByTeaId: Readonly<Record<string, number>>): string | null {
  const [mostLeaves] = Object.entries(gramsByTeaId).sort(([, firstGrams], [, secondGrams]) => secondGrams - firstGrams)
  return mostLeaves === undefined ? null : mostLeaves[0]
}

function clothHeatingOf(state: DeepReadonly<SessionState>, cloth: DeepReadonly<ClothState>): Heating {
  if (!isOnAWorkingHeater(state, cloth.id)) return 'none'
  if (isSteamingInsteadOfCharring(cloth)) return 'steaming'
  return heatingAsItChars(cloth.charring, howAClothChars.burnsFromCharring)
}

function spoonHeatingOf(state: DeepReadonly<SessionState>): Heating {
  if (!isOnAWorkingHeater(state, spoonItemId)) return 'none'
  return heatingAsItChars(state.spoon.charring, howTheSpoonChars.burnsFromCharring)
}

function heatingAsItChars(charring: number, burnsFromCharring: number): Heating {
  if (charring < smokingFromCharring) return 'warming'
  if (charring < scorchingFromCharring) return 'smoking'
  if (charring < smoulderingFromCharring) return 'scorching'
  if (charring < burnsFromCharring) return 'smouldering'
  return 'burning'
}

function vesselView(vessel: DeepReadonly<VesselState>, definition: VesselDefinition, blend: readonly TeaInABlend[], isHeated: boolean): VesselView {
  const brewStage = brewStageOf(vessel.liquid, blend)
  return {
    id: vessel.id,
    fillShare: share(vessel.liquid.volumeMl, definition.capacityMl),
    liquorColour: brewStage === 'water' ? waterColour : liquorColour(vessel.liquid, blend),
    liquorOpacity: liquorOpacityByBrewStage[brewStage],
    steam: steamOf(vessel, definition),
    surfaceMotion: isHeated && !isEmpty(vessel.liquid) ? surfaceMotionAt(vessel.liquid.temperatureC) : 'still',
    brewStage,
    isLidOpen: definition.lid === null ? null : vessel.isLidOpen,
    soakedLeaves: soakedLeavesOf(vessel),
    leavesSeepShare: soakedLeavesOf(vessel) === null ? 0 : leavesSeepShareByBrewStage[brewStage],
    shellGlow: vessel.shellHeat,
    waterTemperatureC: isEmpty(vessel.liquid) ? null : vessel.liquid.temperatureC,
    isWhistling: definition.isMadeForTheHeater && isHeated && !isEmpty(vessel.liquid) && vessel.liquid.temperatureC >= whistlingFromC,
  }
}

function soakedLeavesOf(vessel: DeepReadonly<VesselState>): SoakedLeavesView | null {
  const gramsByTeaId = vessel.leaves?.gramsByTeaId ?? {}
  const grams = totalLeafGrams(gramsByTeaId)
  const teaId = teaWithTheMostLeaves(gramsByTeaId)
  if (teaId === null || grams <= 0) return null
  const count = Math.min(mostSoakedLeavesShown, Math.max(1, Math.round(grams * soakedLeavesShownPerGram)))
  return { teaId, count }
}

function brewStageOf(liquid: Liquid, blend: readonly TeaInABlend[]): BrewStage {
  if (isEmpty(liquid)) return 'water'
  const verdict = judgeTaste(liquid, blend)
  if (verdict.strength === 'extreme') return 'tar'
  if (verdict.bitterness === 'overbrewed') return 'overbrewed'
  switch (verdict.strength) {
    case 'none':
      return 'water'
    case 'weak':
      return 'pale'
    case 'balanced':
      return 'good'
    case 'rich':
    case 'heavy':
      return verdict.strength
  }
}

function liquorColour(liquid: Liquid, blend: readonly TeaInABlend[]): string {
  const brewed = mixColours(waterColour, liquorColourOfTheBlend(blend), liquid.strength / 100)
  const darkening = share(liquid.bitterness - highBitternessFrom, 100 - highBitternessFrom)
  const darkened = mixColours(brewed, overbrewedColour, darkening * darkestShareOfOverbrewedColour)
  return mixColours(darkened, tarColour, share(liquid.strength - extremeStrengthFrom, strengthOfPureTar - extremeStrengthFrom))
}

function liquorColourOfTheBlend(blend: readonly TeaInABlend[]): string {
  const channelsByTea = blend.map(({ tea, share }) => ({ channels: channelsOf(teaLookFor(tea.id).liquorColour), share }))
  return hexColourOf([0, 1, 2].map((channelIndex) => Math.round(channelsByTea.reduce((channel, { channels, share }) => channel + (channels[channelIndex] ?? 0) * share, 0))))
}

function steamOf(vessel: DeepReadonly<VesselState>, definition: VesselDefinition): SteamLevel {
  if (isClosedAgainstPouring(vessel, definition) || isEmpty(vessel.liquid)) return 'none'
  const temperatureC = vessel.liquid.temperatureC
  if (temperatureC >= steamBillowingFromC) return 'billowing'
  if (temperatureC >= steamVisibleFromC) return 'visible'
  if (temperatureC >= steamWispsFromC) return 'wisps'
  return 'none'
}

function surfaceMotionAt(temperatureC: number): SurfaceMotion {
  if (temperatureC >= boilingFromC) return 'boiling'
  if (temperatureC >= simmeringFromC) return 'simmering'
  if (temperatureC >= shimmeringFromC) return 'shimmering'
  return 'still'
}

function share(amount: number, whole: number): number {
  return clampedToShare(amount / whole)
}

function mixColours(from: string, to: string, shareOfTo: number): string {
  const [fromChannels, toChannels] = [channelsOf(from), channelsOf(to)]
  const mixed = fromChannels.map((channel, index) => Math.round(channel + ((toChannels[index] ?? channel) - channel) * share(shareOfTo, 1)))
  return hexColourOf(mixed)
}

function hexColourOf(channels: readonly number[]): string {
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function channelsOf(hexColour: string): number[] {
  return [1, 3, 5].map((start) => Number.parseInt(hexColour.slice(start, start + 2), 16))
}
