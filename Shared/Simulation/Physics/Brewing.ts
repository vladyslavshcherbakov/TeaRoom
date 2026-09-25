import type { TeaDefinition } from '../Definitions/TeaDefinition.ts'
import { isEmpty, type Liquid } from './Liquid.ts'

export type Leaves = {
  readonly teaId: string
  readonly grams: number
  readonly isSteeping: boolean
  readonly isStirredByTheBoil: boolean
  readonly steepedSeconds: number
}

const temperatureBelowWhichNothingSteepsC = 40
const strongestHeatFactor = 1.5
const theBoilStirsExtractionBy = 2

export function steepLeaves(
  liquid: Liquid,
  leaves: Leaves,
  tea: TeaDefinition,
  seconds: number,
): { liquid: Liquid; leaves: Leaves } {
  if (isEmpty(liquid)) return { liquid, leaves }
  const leafRatio = leafRatioOf(leaves, liquid, tea)
  const extractionFactor = leafRatio * heatFactorOf(liquid.temperatureC, tea) * (leaves.isStirredByTheBoil ? theBoilStirsExtractionBy : 1)
  return {
    liquid: {
      ...liquid,
      strength: strengthAfter(liquid.strength, tea, extractionFactor, seconds),
      bitterness: Math.min(100, liquid.bitterness + bitternessPerSecond(liquid, leaves, tea, extractionFactor) * seconds),
    },
    leaves: { ...leaves, steepedSeconds: leaves.steepedSeconds + seconds },
  }
}

function leafRatioOf(leaves: Leaves, liquid: Liquid, tea: TeaDefinition): number {
  const gramsPer100Ml = (leaves.grams * 100) / liquid.volumeMl
  return gramsPer100Ml / tea.steeping.idealGramsPer100Ml
}

function heatFactorOf(temperatureC: number, tea: TeaDefinition): number {
  const factor = (temperatureC - temperatureBelowWhichNothingSteepsC) / (tea.water.idealC - temperatureBelowWhichNothingSteepsC)
  return Math.min(strongestHeatFactor, Math.max(0, factor))
}

function strengthAfter(strength: number, tea: TeaDefinition, extractionFactor: number, seconds: number): number {
  const shareOfRemainingExtracted = Math.min(1, tea.extraction.strengthRatePerSecond * extractionFactor * seconds)
  return strength + (100 - strength) * shareOfRemainingExtracted
}

function bitternessPerSecond(liquid: Liquid, leaves: Leaves, tea: TeaDefinition, extractionFactor: number): number {
  const isPastIdealTime = leaves.steepedSeconds >= tea.steeping.idealSeconds
  const oversteepMultiplier = isPastIdealTime ? tea.extraction.bitternessMultiplierAfterIdealTime : 1
  const degreesAboveGood = Math.max(0, liquid.temperatureC - tea.water.good.highestC)
  const overheatMultiplier = 1 + degreesAboveGood * tea.extraction.bitternessGainPerDegreeAboveGood
  return tea.extraction.bitternessPerSecond * extractionFactor * oversteepMultiplier * overheatMultiplier
}
