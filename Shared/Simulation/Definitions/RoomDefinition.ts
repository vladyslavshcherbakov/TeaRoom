import type { TimeOfDay, Weather } from './Atmosphere.ts'

export type Spot = {
  readonly placeId: string
  readonly x: number
  readonly y: number
  readonly z: number
  readonly turnRadians?: number
}

export type RoomVessel = {
  readonly id: string
  readonly definitionId: string
  readonly initialWaterMl: number
  readonly startsAt: Spot
}

export type TapDefinition = {
  readonly sinkSpot: Spot
  readonly waterTemperatureC: number
  readonly flowMlPerSecond: number
}

export type RoomCloth = {
  readonly id: string
  readonly startsAt: Spot
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
  readonly vessels: readonly RoomVessel[]
  readonly figurineIds: readonly string[]
  readonly caddyGrams: number
  readonly spoonCapacityGrams: number
  readonly spoonStartsAt: Spot
  readonly cloths: readonly RoomCloth[]
}
