import type { RoomCloth, RoomDefinition, Spot } from '../Simulation/Definitions/RoomDefinition.ts'

export type KitchenPlacement = 'besideTheWindow' | 'facingTheWindow'

export type ToolsPlacement = 'onTheTeaTable' | 'apart'

export type QuietRoomArrangement = {
  readonly kitchen: KitchenPlacement
  readonly tools: ToolsPlacement
  readonly clothCount: number
}

type ToolSpots = {
  readonly caddy: Spot
  readonly spoon: Spot
  readonly cloth: Spot
}

type SpotsOfAKitchen = {
  readonly heater: Spot
  readonly sink: Spot
  readonly kettle: Spot
  readonly thermos: Spot
  readonly bowls: readonly Spot[]
  readonly tools: Readonly<Record<ToolsPlacement, ToolSpots>>
  readonly secondCloth: Spot
}

export const kitchenPlacements: readonly KitchenPlacement[] = ['besideTheWindow', 'facingTheWindow']
export const toolsPlacements: readonly ToolsPlacement[] = ['onTheTeaTable', 'apart']
export const clothCounts: readonly number[] = [1, 2]

const bowlCount = 10
const clothIds = ['cloth', 'cloth2']

const spotsByKitchen: Readonly<Record<KitchenPlacement, SpotsOfAKitchen>> = {
  besideTheWindow: {
    heater: { placeId: 'counter', x: -2.35, y: 0.95, z: -2.65 },
    sink: { placeId: 'counter', x: -1.45, y: 0.82, z: -2.7 },
    kettle: { placeId: 'counter', x: -1.9, y: 0.9, z: -2.6 },
    thermos: { placeId: 'counter', x: -1, y: 0.9, z: -2.7 },
    bowls: [
      { placeId: 'shelf', x: -2.75, y: 0.72, z: 0.1 },
      { placeId: 'shelf', x: -2.75, y: 0.72, z: 0.45 },
      { placeId: 'shelf', x: -2.75, y: 0.72, z: 0.8 },
      { placeId: 'shelf', x: -2.75, y: 0.07, z: 0.1 },
      { placeId: 'shelf', x: -2.75, y: 0.07, z: 0.45 },
      { placeId: 'shelf', x: -2.75, y: 0.07, z: 0.8 },
      { placeId: 'shelf', x: -2.75, y: 0.72, z: 1.15 },
      { placeId: 'shelf', x: -2.75, y: 0.07, z: 1.15 },
      { placeId: 'shelf', x: -2.75, y: 0.72, z: -0.25 },
      { placeId: 'shelf', x: -2.75, y: 0.07, z: -0.25 },
    ],
    tools: {
      onTheTeaTable: {
        caddy: { placeId: 'shelf', x: -2.75, y: 1.22, z: -0.1 },
        spoon: { placeId: 'teaTable', x: 1.45, y: 0.42, z: -1.3 },
        cloth: { placeId: 'teaTable', x: 0.5, y: 0.42, z: -1.25 },
      },
      apart: {
        caddy: { placeId: 'teaTable', x: 0.75, y: 0.42, z: -1.75 },
        spoon: { placeId: 'counter', x: -2.65, y: 0.9, z: -2.4 },
        cloth: { placeId: 'shelf', x: -2.75, y: 1.22, z: 0.9 },
      },
    },
    secondCloth: { placeId: 'counter', x: -0.95, y: 0.9, z: -2.42 },
  },
  facingTheWindow: {
    heater: { placeId: 'counter', x: -2, y: 0.95, z: -2.65 },
    sink: { placeId: 'counter', x: -1.1, y: 0.82, z: -2.7 },
    kettle: { placeId: 'counter', x: -1.55, y: 0.9, z: -2.6 },
    thermos: { placeId: 'counter', x: -0.65, y: 0.9, z: -2.7 },
    bowls: [
      { placeId: 'shelf', x: 1.45, y: 0.72, z: -2.75 },
      { placeId: 'shelf', x: 1.8, y: 0.72, z: -2.75 },
      { placeId: 'shelf', x: 2.15, y: 0.72, z: -2.75 },
      { placeId: 'shelf', x: 1.45, y: 0.07, z: -2.75 },
      { placeId: 'shelf', x: 1.8, y: 0.07, z: -2.75 },
      { placeId: 'shelf', x: 2.15, y: 0.07, z: -2.75 },
      { placeId: 'shelf', x: 2.5, y: 0.72, z: -2.75 },
      { placeId: 'shelf', x: 2.5, y: 0.07, z: -2.75 },
      { placeId: 'shelf', x: 1.1, y: 0.72, z: -2.75 },
      { placeId: 'shelf', x: 1.1, y: 0.07, z: -2.75 },
    ],
    tools: {
      onTheTeaTable: {
        caddy: { placeId: 'shelf', x: 1.25, y: 1.22, z: -2.75 },
        spoon: { placeId: 'teaTable', x: -1.9, y: 0.42, z: 0.5 },
        cloth: { placeId: 'teaTable', x: -2.35, y: 0.42, z: -0.45 },
      },
      apart: {
        caddy: { placeId: 'teaTable', x: -2.1, y: 0.42, z: -0.4 },
        spoon: { placeId: 'counter', x: -2.3, y: 0.9, z: -2.4 },
        cloth: { placeId: 'shelf', x: 2.3, y: 1.22, z: -2.75 },
      },
    },
    secondCloth: { placeId: 'counter', x: -0.6, y: 0.9, z: -2.42 },
  },
}

export const quietRoomArrangements: readonly QuietRoomArrangement[] = kitchenPlacements.flatMap((kitchen) =>
  toolsPlacements.flatMap((tools) => clothCounts.map((clothCount) => ({ kitchen, tools, clothCount }))),
)

export function quietRoomArrangedAs(arrangement: QuietRoomArrangement): RoomDefinition {
  const spots = spotsByKitchen[arrangement.kitchen]
  const tools = spots.tools[arrangement.tools]
  return {
    id: 'quietRoom',
    ambientTemperatureC: 22,
    timesOfDay: ['dawn', 'day', 'sunset'],
    weathers: ['rain'],
    places: ['counter', 'shelf', 'teaTable'],
    keeperStartsAt: null,
    ritualPlaceId: 'teaTable',
    heaterId: 'electricPlate',
    heaterSpot: spots.heater,
    tap: { sinkSpot: spots.sink, waterTemperatureC: 18, flowMlPerSecond: 50 },
    vessels: [
      { id: 'kettle', definitionId: 'clayKettle', initialWaterMl: 0, startsAt: spots.kettle },
      { id: 'thermos', definitionId: 'thermos', initialWaterMl: 0, startsAt: spots.thermos },
      ...spots.bowls.slice(0, bowlCount).map((startsAt, index) => ({ id: `bowl${index + 1}`, definitionId: 'teaBowl', initialWaterMl: 0, startsAt })),
      { id: 'caddy', definitionId: 'teaCaddy', initialWaterMl: 0, startsAt: tools.caddy },
    ],
    figurineIds: ['dragon', 'toad'],
    caddyGrams: 60,
    spoonCapacityGrams: 3,
    spoonStartsAt: tools.spoon,
    cloths: clothsOf(arrangement.clothCount, tools.cloth, spots.secondCloth),
  }
}

export const quietRoom = quietRoomArrangedAs({ kitchen: 'besideTheWindow', tools: 'onTheTeaTable', clothCount: 1 })

function clothsOf(clothCount: number, firstCloth: Spot, secondCloth: Spot): RoomCloth[] {
  return clothIds.slice(0, clothCount).map((id, index) => ({ id, startsAt: index === 0 ? firstCloth : secondCloth }))
}
