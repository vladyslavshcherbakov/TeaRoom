import type { RoomDefinition } from '../Simulation/Definitions/RoomDefinition.ts'

export const quietRoom: RoomDefinition = {
  id: 'quietRoom',
  ambientTemperatureC: 22,
  timesOfDay: ['sunset', 'dawn', 'night'],
  weathers: ['rain'],
  places: ['counter', 'shelf', 'teaTable'],
  keeperStartsAt: null,
  ritualPlaceId: 'teaTable',
  heaterId: 'electricPlate',
  heaterSpot: { placeId: 'counter', x: -2.35, y: 0.95, z: -2.65 },
  tap: { placeId: 'counter', waterTemperatureC: 18, flowMlPerSecond: 50 },
  vessels: [
    { id: 'kettle', definitionId: 'clayKettle', initialWaterMl: 0, startsAt: { placeId: 'counter', x: -1.9, y: 0.9, z: -2.6 } },
    { id: 'thermos', definitionId: 'thermos', initialWaterMl: 0, startsAt: { placeId: 'counter', x: -1, y: 0.9, z: -2.7 } },
    { id: 'bowl1', definitionId: 'teaBowl', initialWaterMl: 0, startsAt: { placeId: 'shelf', x: -2.75, y: 0.72, z: 0.1 } },
    { id: 'bowl2', definitionId: 'teaBowl', initialWaterMl: 0, startsAt: { placeId: 'shelf', x: -2.75, y: 0.72, z: 0.45 } },
    { id: 'bowl3', definitionId: 'teaBowl', initialWaterMl: 0, startsAt: { placeId: 'shelf', x: -2.75, y: 0.72, z: 0.8 } },
  ],
  figurineIds: ['dragon', 'toad'],
  caddyGrams: 60,
  caddyStartsAt: { placeId: 'shelf', x: -2.75, y: 1.22, z: -0.1 },
  spoonCapacityGrams: 3,
  spoonStartsAt: { placeId: 'teaTable', x: 1.45, y: 0.42, z: -1.3 },
  clothStartsAt: { placeId: 'teaTable', x: 0.5, y: 0.42, z: -1.25 },
}
