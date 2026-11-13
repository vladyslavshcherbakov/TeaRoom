import type { HeatRange, TeaDefinition } from '../Definitions/Brewing.ts'
import type { BrewTimings } from '../Definitions/TeahouseCatalog.ts'
import type { Brew, SteepVerdict, WaterVerdict } from '../State/TeahouseState.ts'

export function waterVerdict(tea: TeaDefinition, heat: number): WaterVerdict {
  return placeIn(tea.waterHeat, heat, { below: 'tooCool', inside: 'right', above: 'scalding' })
}

export function steepVerdict(tea: TeaDefinition, steepShare: number): SteepVerdict {
  return placeIn(tea.steepShare, steepShare, { below: 'weak', inside: 'right', above: 'bitter' })
}

export function brewOf(tea: TeaDefinition, water: WaterVerdict, steep: SteepVerdict, timings: BrewTimings): Brew {
  const isGood = water === 'right' && steep === 'right'
  return { teaId: tea.id, water, steep, cups: isGood ? timings.cupsOfAGoodBrew : timings.cupsOfAPoorBrew }
}

function placeIn<Verdict>(range: HeatRange, value: number, verdicts: { readonly below: Verdict; readonly inside: Verdict; readonly above: Verdict }): Verdict {
  if (value < range.from) return verdicts.below
  if (value > range.to) return verdicts.above
  return verdicts.inside
}
