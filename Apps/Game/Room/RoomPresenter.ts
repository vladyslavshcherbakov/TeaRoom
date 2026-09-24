import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { TeaDefinition } from '../../../Shared/Simulation/Definitions/TeaDefinition.ts'
import type { VesselDefinition } from '../../../Shared/Simulation/Definitions/VesselDefinition.ts'
import { judgeTaste } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { isEmpty, type Liquid } from '../../../Shared/Simulation/Physics/Liquid.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { SessionState, VesselState } from '../../../Shared/Simulation/State/SessionState.ts'
import type { RoomViewState } from './RoomViewState.ts'

const waterColour = '#dfe7ea'
const overbrewedColour = '#2b1a10'
const strengthBelowWhichTeaLooksLikeWater = 5
const bitternessWhereDarkeningStarts = 45
const darkestShareOfOverbrewedColour = 0.5
const steamWispsFromC = 60
const steamVisibleFromC = 75
const steamBillowingFromC = 85
const humQuietBelowC = 60
const leavesFillingTheBottomGrams = 10
const puddleFullAtMl = 30
const godsPlaqueMarks = 5

export function roomViewState(state: DeepReadonly<SessionState>, catalog: Catalog): RoomViewState {
  const tea = state.teaId === null ? null : definitionIn(catalog, 'teas', state.teaId)
  const vessels: Record<string, RoomViewState.Vessel> = {}
  for (const vessel of Object.values(state.vessels)) vessels[vessel.id] = vesselView(vessel, definitionIn(catalog, 'vessels', vessel.definitionId), tea)
  return {
    vessels,
    heater: heaterView(state),
    caddy: { isOpen: state.caddy.isOpen, fillShare: share(state.caddy.grams, definitionIn(catalog, 'rooms', state.roomId).caddyGrams) },
    spoonFillShare: share(state.spoon.grams, state.spoon.capacityGrams),
    puddleShare: share(state.tableWetMl, puddleFullAtMl),
    godsPlaque: { litMarks: Math.round((state.godsSatisfaction / 100) * godsPlaqueMarks), totalMarks: godsPlaqueMarks },
  }
}

function vesselView(vessel: DeepReadonly<VesselState>, definition: VesselDefinition, tea: TeaDefinition | null): RoomViewState.Vessel {
  const brewStage = brewStageOf(vessel.liquid, tea)
  return {
    id: vessel.id,
    fillShare: share(vessel.liquid.volumeMl, definition.capacityMl),
    liquorColour: tea === null || brewStage === 'water' ? waterColour : liquorColour(vessel.liquid, tea),
    steam: steamOf(vessel, definition),
    brewStage,
    isLidOpen: definition.lid === null ? null : vessel.isLidOpen,
    leavesShare: share(vessel.leaves?.grams ?? 0, leavesFillingTheBottomGrams),
  }
}

function brewStageOf(liquid: Liquid, tea: TeaDefinition | null): RoomViewState.BrewStage {
  if (tea === null || isEmpty(liquid) || liquid.strength < strengthBelowWhichTeaLooksLikeWater) return 'water'
  const verdict = judgeTaste(liquid, tea)
  if (verdict.bitterness === 'overbrewed') return 'overbrewed'
  if (verdict.strength === 'weak') return 'pale'
  if (verdict.strength === 'balanced') return 'good'
  return verdict.strength
}

function liquorColour(liquid: Liquid, tea: TeaDefinition): string {
  const brewed = mixColours(waterColour, tea.liquorColour, liquid.strength / 100)
  const darkening = share(liquid.bitterness - bitternessWhereDarkeningStarts, 100 - bitternessWhereDarkeningStarts)
  return mixColours(brewed, overbrewedColour, darkening * darkestShareOfOverbrewedColour)
}

function steamOf(vessel: DeepReadonly<VesselState>, definition: VesselDefinition): RoomViewState.SteamLevel {
  const isSealed = definition.lid?.mustBeOpenToPour === true && !vessel.isLidOpen
  if (isSealed || isEmpty(vessel.liquid)) return 'none'
  const temperatureC = vessel.liquid.temperatureC
  if (temperatureC >= steamBillowingFromC) return 'billowing'
  if (temperatureC >= steamVisibleFromC) return 'visible'
  if (temperatureC >= steamWispsFromC) return 'wisps'
  return 'none'
}

function heaterView(state: DeepReadonly<SessionState>): RoomViewState.Heater {
  const { isOn, vesselIdOnTop } = state.heater
  const heatedVessel = vesselIdOnTop === null ? undefined : state.vessels[vesselIdOnTop]
  return { isOn, vesselIdOnTop, hum: isOn && heatedVessel !== undefined ? humOf(heatedVessel.liquid.temperatureC) : 'silent' }
}

function humOf(temperatureC: number): RoomViewState.Heater['hum'] {
  if (temperatureC >= steamBillowingFromC) return 'rumbling'
  if (temperatureC >= steamVisibleFromC) return 'active'
  if (temperatureC >= humQuietBelowC) return 'rising'
  return 'quiet'
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
