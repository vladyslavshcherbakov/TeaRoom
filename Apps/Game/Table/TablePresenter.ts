import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { TeaDefinition } from '../../../Shared/Simulation/Definitions/TeaDefinition.ts'
import type { VesselDefinition } from '../../../Shared/Simulation/Definitions/VesselDefinition.ts'
import { judgeTaste } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { isEmpty, type Liquid } from '../../../Shared/Simulation/Physics/Liquid.ts'
import { spoonCrumblesFromCharring } from '../../../Shared/Simulation/Physics/Heat.ts'
import { clothItemId, spoonItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState, VesselState } from '../../../Shared/Simulation/State/SessionState.ts'
import type { TableViewState } from './TableViewState.ts'
import { teaLookFor } from './TeaLooks.ts'

const waterColour = '#c9e3f0'
const overbrewedColour = '#2b1a10'
const bitternessWhereDarkeningStarts = 45
const darkestShareOfOverbrewedColour = 0.5
const steamWispsFromC = 60
const steamVisibleFromC = 75
const steamBillowingFromC = 85
const shimmeringFromC = 40
const simmeringFromC = 55
const boilingFromC = 95
const puddleFullAtMl = 30
const soakedLeavesShownPerGram = 2
export const mostSoakedLeavesShown = 12
const liquorOpacityByBrewStage: Readonly<Record<TableViewState.BrewStage, number>> = { water: 0.5, pale: 0.6, good: 0.68, rich: 0.8, heavy: 0.9, overbrewed: 0.95 }
const clothSoakedAtMl = 25
const smokingFromCharring = 0.035
const scorchingFromCharring = 0.2
export const smoulderingFromCharring = 0.5
const clothBurnsFromCharring = 0.8

export function tableViewState(state: DeepReadonly<SessionState>, catalog: Catalog): TableViewState {
  const tea = state.teaId === null ? null : definitionIn(catalog, 'teas', state.teaId)
  const vessels: Record<string, TableViewState.Vessel> = {}
  const heatedVesselId = state.heater.isOn ? state.heater.itemIdOnTop : null
  for (const vessel of Object.values(state.vessels)) {
    vessels[vessel.id] = vesselView(vessel, definitionIn(catalog, 'vessels', vessel.definitionId), tea, vessel.id === heatedVesselId)
  }
  return {
    vessels,
    isHeaterOn: state.heater.isOn,
    caddy: { isOpen: state.caddy.isOpen, fillShare: share(state.caddy.grams, definitionIn(catalog, 'rooms', state.roomId).caddyGrams) },
    spoonFillShare: share(state.spoon.grams, state.spoon.capacityGrams),
    clothWetShare: share(state.cloth.wetMl, clothSoakedAtMl),
    clothTeaStain: state.cloth.teaStain,
    charringByItem: {
      [clothItemId]: { charring: state.cloth.charring, heating: clothHeatingOf(state) },
      [spoonItemId]: { charring: state.spoon.charring, heating: spoonHeatingOf(state) },
    },
    puddles: Object.entries(state.puddles).map(([placeId, puddle]) => ({ placeId, spilledAround: puddle.spilledAround === null ? null : { x: puddle.spilledAround.x, y: puddle.spilledAround.y, z: puddle.spilledAround.z }, share: puddleShareOf(puddle.wetMl) })),
  }
}

export function puddleShareOf(wetMl: number): number {
  return share(wetMl, puddleFullAtMl)
}

function clothHeatingOf(state: DeepReadonly<SessionState>): TableViewState.Heating {
  if (!isOnAWorkingHeater(state, clothItemId)) return 'none'
  if (state.cloth.wetMl > 0) return 'steaming'
  return heatingAsItChars(state.cloth.charring, clothBurnsFromCharring)
}

function spoonHeatingOf(state: DeepReadonly<SessionState>): TableViewState.Heating {
  if (!isOnAWorkingHeater(state, spoonItemId)) return 'none'
  return heatingAsItChars(state.spoon.charring, spoonCrumblesFromCharring)
}

function isOnAWorkingHeater(state: DeepReadonly<SessionState>, itemId: string): boolean {
  return state.heater.isOn && state.heater.itemIdOnTop === itemId
}

function heatingAsItChars(charring: number, burnsFromCharring: number): TableViewState.Heating {
  if (charring < smokingFromCharring) return 'warming'
  if (charring < scorchingFromCharring) return 'smoking'
  if (charring < smoulderingFromCharring) return 'scorching'
  if (charring < burnsFromCharring) return 'smouldering'
  return 'burning'
}

function vesselView(vessel: DeepReadonly<VesselState>, definition: VesselDefinition, tea: TeaDefinition | null, isHeated: boolean): TableViewState.Vessel {
  const brewStage = brewStageOf(vessel.liquid, tea)
  return {
    id: vessel.id,
    fillShare: share(vessel.liquid.volumeMl, definition.capacityMl),
    liquorColour: tea === null || brewStage === 'water' ? waterColour : liquorColour(vessel.liquid, tea),
    liquorOpacity: liquorOpacityByBrewStage[brewStage],
    steam: steamOf(vessel, definition),
    surfaceMotion: isHeated && !isEmpty(vessel.liquid) ? surfaceMotionAt(vessel.liquid.temperatureC) : 'still',
    brewStage,
    isLidOpen: definition.lid === null ? null : vessel.isLidOpen,
    soakedLeaves: soakedLeavesOf(vessel),
    shellGlow: vessel.shellHeat,
  }
}

function soakedLeavesOf(vessel: DeepReadonly<VesselState>): TableViewState.SoakedLeaves | null {
  if (vessel.leaves === null || vessel.leaves.grams <= 0) return null
  const count = Math.min(mostSoakedLeavesShown, Math.max(1, Math.round(vessel.leaves.grams * soakedLeavesShownPerGram)))
  return { teaId: vessel.leaves.teaId, count }
}

function brewStageOf(liquid: Liquid, tea: TeaDefinition | null): TableViewState.BrewStage {
  if (tea === null || isEmpty(liquid)) return 'water'
  const verdict = judgeTaste(liquid, tea)
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
    case 'extreme':
      return 'heavy'
  }
}

function liquorColour(liquid: Liquid, tea: TeaDefinition): string {
  const brewed = mixColours(waterColour, teaLookFor(tea.id).liquorColour, liquid.strength / 100)
  const darkening = share(liquid.bitterness - bitternessWhereDarkeningStarts, 100 - bitternessWhereDarkeningStarts)
  return mixColours(brewed, overbrewedColour, darkening * darkestShareOfOverbrewedColour)
}

function steamOf(vessel: DeepReadonly<VesselState>, definition: VesselDefinition): TableViewState.SteamLevel {
  const isSealed = definition.lid?.mustBeOpenToPour === true && !vessel.isLidOpen
  if (isSealed || isEmpty(vessel.liquid)) return 'none'
  const temperatureC = vessel.liquid.temperatureC
  if (temperatureC >= steamBillowingFromC) return 'billowing'
  if (temperatureC >= steamVisibleFromC) return 'visible'
  if (temperatureC >= steamWispsFromC) return 'wisps'
  return 'none'
}

function surfaceMotionAt(temperatureC: number): TableViewState.SurfaceMotion {
  if (temperatureC >= boilingFromC) return 'boiling'
  if (temperatureC >= simmeringFromC) return 'simmering'
  if (temperatureC >= shimmeringFromC) return 'shimmering'
  return 'still'
}

function share(amount: number, whole: number): number {
  return Math.min(1, Math.max(0, amount / whole))
}

function mixColours(from: string, to: string, shareOfTo: number): string {
  const [fromChannels, toChannels] = [channelsOf(from), channelsOf(to)]
  const mixed = fromChannels.map((channel, index) => Math.round(channel + ((toChannels[index] ?? channel) - channel) * share(shareOfTo, 1)))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function channelsOf(hexColour: string): number[] {
  return [1, 3, 5].map((start) => Number.parseInt(hexColour.slice(start, start + 2), 16))
}
