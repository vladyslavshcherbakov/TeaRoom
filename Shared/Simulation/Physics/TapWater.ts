import type { TapDefinition } from '../Definitions/RoomDefinition.ts'
import { mixLiquids, water, type Liquid } from './Liquid.ts'

export type TapFill = {
  readonly liquid: Liquid
  readonly filledMl: number
  readonly overflowedMl: number
}

export function fillFromTap(liquid: Liquid, capacityMl: number, tap: TapDefinition, seconds: number): TapFill {
  const runningMl = tap.flowMlPerSecond * seconds
  const filledMl = Math.min(runningMl, Math.max(0, capacityMl - liquid.volumeMl))
  return {
    liquid: mixLiquids(liquid, water(filledMl, tap.waterTemperatureC)),
    filledMl,
    overflowedMl: runningMl - filledMl,
  }
}
