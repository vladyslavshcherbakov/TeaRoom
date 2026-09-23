import type { TimeOfDay, Weather } from './Atmosphere.ts'

export type TableVessel = {
  readonly id: string
  readonly definitionId: string
  readonly initialWaterMl: number
}

export type RoomDefinition = {
  readonly id: string
  readonly ambientTemperatureC: number
  readonly timesOfDay: readonly TimeOfDay[]
  readonly weathers: readonly Weather[]
  readonly heaterId: string
  readonly vessels: readonly TableVessel[]
  readonly figurineIds: readonly string[]
  readonly caddyGrams: number
  readonly spoonCapacityGrams: number
}
