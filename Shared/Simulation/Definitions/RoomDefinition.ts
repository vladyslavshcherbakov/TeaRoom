import type { TimeOfDay, Weather } from './Atmosphere.ts'

export type Spot = {
  readonly placeId: string
  readonly x: number
  readonly y: number
  readonly z: number
}

export type TableVessel = {
  readonly id: string
  readonly definitionId: string
  readonly initialWaterMl: number
  readonly startsAt: Spot
}

export type TapDefinition = {
  readonly placeId: string
  readonly waterTemperatureC: number
  readonly flowMlPerSecond: number
}

export type RoomDefinition = {
  readonly id: string
  readonly ambientTemperatureC: number
  readonly timesOfDay: readonly TimeOfDay[]
  readonly weathers: readonly Weather[]
  readonly places: readonly string[]
  readonly keeperStartsAt: string | null
  readonly ritualPlaceId: string
  readonly heaterId: string
  readonly heaterSpot: Spot
  readonly tap: TapDefinition | null
  readonly vessels: readonly TableVessel[]
  readonly figurineIds: readonly string[]
  readonly caddyGrams: number
  readonly caddyStartsAt: Spot
  readonly spoonCapacityGrams: number
  readonly spoonStartsAt: Spot
  readonly clothStartsAt: Spot
}
