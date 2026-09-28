import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import { mixLiquids, water, type Liquid } from './Liquid.ts'

export type TapFill = {
  readonly liquid: Liquid
  readonly filledMl: number
  readonly overflowedMl: number
}

const leavesWashedOutPerFullVolumeRunOver = 2
const leavesGoneBelowGrams = 0.1

export function fillFromTap(liquid: Liquid, capacityMl: number, tap: TapDefinition, seconds: number): TapFill {
  const runningMl = tap.flowMlPerSecond * seconds
  const mixed = mixLiquids(liquid, water(runningMl, tap.waterTemperatureC))
  const overflowedMl = Math.max(0, mixed.volumeMl - Math.max(capacityMl, liquid.volumeMl))
  return {
    liquid: { ...mixed, volumeMl: mixed.volumeMl - overflowedMl },
    filledMl: runningMl - overflowedMl,
    overflowedMl,
  }
}

export function leafGramsLeftAfterRunningOver(grams: number, overflowedMl: number, capacityMl: number): number {
  const gramsLeft = grams * Math.exp((-leavesWashedOutPerFullVolumeRunOver * overflowedMl) / capacityMl)
  return gramsLeft < leavesGoneBelowGrams ? 0 : gramsLeft
}
