import type { TeaDefinition } from '../Definitions/TeaDefinition.ts'
import { isEmpty, strengthenedBy, type Liquid } from './Liquid.ts'

export type Leaves = {
  readonly gramsByTeaId: Readonly<Record<string, number>>
  readonly isSteeping: boolean
  readonly isStirredByTheBoil: boolean
  readonly steepedSecondsByTeaId: Readonly<Record<string, number>>
}

type Extraction = {
  readonly teaId: string
  readonly tea: TeaDefinition
  readonly factor: number
}

const temperatureBelowWhichNothingSteepsC = 40
const strongestHeatFactor = 1.5
const theBoilStirsExtractionBy = 2

export function dryLeaves(gramsByTeaId: Readonly<Record<string, number>>): Leaves {
  return { gramsByTeaId, isSteeping: false, isStirredByTheBoil: false, steepedSecondsByTeaId: zeroSecondsForEachTeaOf(gramsByTeaId) }
}

export function leavesWithMoreAdded(leaves: Leaves, addedGramsByTeaId: Readonly<Record<string, number>>): Leaves {
  const gramsByTeaId = leafGramsTogether(leaves.gramsByTeaId, addedGramsByTeaId)
  return { ...leaves, gramsByTeaId, steepedSecondsByTeaId: { ...zeroSecondsForEachTeaOf(gramsByTeaId), ...leaves.steepedSecondsByTeaId } }
}

export function leavesStartingToSteep(leaves: Leaves): Leaves {
  return { ...leaves, isSteeping: true, steepedSecondsByTeaId: zeroSecondsForEachTeaOf(leaves.gramsByTeaId) }
}

export function leavesNoLongerSteeping(leaves: Leaves): Leaves {
  return { ...leaves, isSteeping: false, isStirredByTheBoil: false, steepedSecondsByTeaId: zeroSecondsForEachTeaOf(leaves.gramsByTeaId) }
}

export function steepedSecondsOf(leaves: Leaves, teaId: string): number {
  return leaves.steepedSecondsByTeaId[teaId] ?? 0
}

export function hasAnyTeaSteeped(leaves: Leaves): boolean {
  return Object.values(leaves.steepedSecondsByTeaId).some((seconds) => seconds > 0)
}

export function totalLeafGrams(gramsByTeaId: Readonly<Record<string, number>>): number {
  return Object.values(gramsByTeaId).reduce((total, grams) => total + grams, 0)
}

export function leafGramsTogether(first: Readonly<Record<string, number>>, second: Readonly<Record<string, number>>): Record<string, number> {
  const teaIds = new Set([...Object.keys(first), ...Object.keys(second)])
  return Object.fromEntries([...teaIds].map((teaId) => [teaId, (first[teaId] ?? 0) + (second[teaId] ?? 0)]))
}

export function leafGramsScaledBy(gramsByTeaId: Readonly<Record<string, number>>, share: number): Record<string, number> {
  return Object.fromEntries(Object.entries(gramsByTeaId).map(([teaId, grams]) => [teaId, grams * share]))
}

export function splitLeafGrams(gramsByTeaId: Readonly<Record<string, number>>, requestedGrams: number): { taken: Record<string, number>; left: Record<string, number> } {
  const gramsOfEveryTea = totalLeafGrams(gramsByTeaId)
  const takenGrams = Math.min(Math.max(requestedGrams, 0), gramsOfEveryTea)
  const taken: Record<string, number> = {}
  const left: Record<string, number> = {}
  for (const [teaId, grams] of Object.entries(gramsByTeaId)) {
    const gramsTaken = gramsOfEveryTea > 0 ? takenGrams * (grams / gramsOfEveryTea) : 0
    if (gramsTaken > 0) taken[teaId] = gramsTaken
    if (grams - gramsTaken > 0) left[teaId] = grams - gramsTaken
  }
  return { taken, left }
}

export function steepLeaves(liquid: Liquid, leaves: Leaves, teaOf: (teaId: string) => TeaDefinition, seconds: number): { liquid: Liquid; leaves: Leaves } {
  if (isEmpty(liquid)) return { liquid, leaves }
  const extractions = Object.entries(leaves.gramsByTeaId).map(([teaId, grams]): Extraction => {
    const tea = teaOf(teaId)
    return { teaId, tea, factor: leafRatioOf(grams, liquid, tea) * heatFactorOf(liquid.temperatureC, tea) * (leaves.isStirredByTheBoil ? theBoilStirsExtractionBy : 1) }
  })
  const strengthened = strengthenedByEveryTea(liquid, extractions, seconds)
  const addedBitterness = extractions.reduce((total, extraction) => total + bitternessPerSecond(liquid, leaves, extraction) * seconds, 0)
  const steepedSecondsByTeaId = Object.fromEntries(Object.keys(leaves.gramsByTeaId).map((teaId) => [teaId, steepedSecondsOf(leaves, teaId) + seconds]))
  return {
    liquid: { ...strengthened, bitterness: Math.min(100, liquid.bitterness + addedBitterness) },
    leaves: { ...leaves, steepedSecondsByTeaId },
  }
}

function zeroSecondsForEachTeaOf(gramsByTeaId: Readonly<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(Object.keys(gramsByTeaId).map((teaId) => [teaId, 0]))
}

function leafRatioOf(grams: number, liquid: Liquid, tea: TeaDefinition): number {
  const gramsPer100Ml = (grams * 100) / liquid.volumeMl
  return gramsPer100Ml / tea.steeping.idealGramsPer100Ml
}

function heatFactorOf(temperatureC: number, tea: TeaDefinition): number {
  const factor = (temperatureC - temperatureBelowWhichNothingSteepsC) / (tea.water.idealC - temperatureBelowWhichNothingSteepsC)
  return Math.min(strongestHeatFactor, Math.max(0, factor))
}

function strengthenedByEveryTea(liquid: Liquid, extractions: readonly Extraction[], seconds: number): Liquid {
  const gapTo100 = 100 - liquid.strength
  const sharesOfTheGap = sharesOfTheGapClosedBy(extractions, seconds)
  return extractions.reduce((strengthened, { teaId }, index) => strengthenedBy(strengthened, teaId, gapTo100 * (sharesOfTheGap[index] ?? 0)), liquid)
}

function sharesOfTheGapClosedBy(extractions: readonly Extraction[], seconds: number): readonly number[] {
  const sharesOfTheGap = extractions.map(({ tea, factor }) => tea.extraction.strengthRatePerSecond * factor * seconds)
  const shareOfEveryTea = sharesOfTheGap.reduce((total, share) => total + share, 0)
  return shareOfEveryTea <= 1 ? sharesOfTheGap : sharesOfTheGap.map((share) => share / shareOfEveryTea)
}

function bitternessPerSecond(liquid: Liquid, leaves: Leaves, { teaId, tea, factor }: Extraction): number {
  const isPastIdealTime = steepedSecondsOf(leaves, teaId) >= tea.steeping.idealSeconds
  const oversteepMultiplier = isPastIdealTime ? tea.extraction.bitternessMultiplierAfterIdealTime : 1
  const degreesAboveGood = Math.max(0, liquid.temperatureC - tea.water.good.highestC)
  const overheatMultiplier = 1 + degreesAboveGood * tea.extraction.bitternessGainPerDegreeAboveGood
  return tea.extraction.bitternessPerSecond * factor * oversteepMultiplier * overheatMultiplier
}
