import type { RoomDefinition } from '../Simulation/Definitions/RoomDefinition.ts'

export const quietRoom: RoomDefinition = {
  id: 'quietRoom',
  ambientTemperatureC: 22,
  timesOfDay: ['sunset', 'dawn', 'night'],
  weathers: ['rain'],
  heaterId: 'electricPlate',
  vessels: [
    { id: 'kettle', definitionId: 'clayKettle', initialWaterMl: 500 },
    { id: 'thermos', definitionId: 'thermos', initialWaterMl: 0 },
    { id: 'bowl1', definitionId: 'teaBowl', initialWaterMl: 0 },
    { id: 'bowl2', definitionId: 'teaBowl', initialWaterMl: 0 },
    { id: 'bowl3', definitionId: 'teaBowl', initialWaterMl: 0 },
  ],
  figurineIds: ['dragon', 'toad'],
  caddyGrams: 60,
  spoonCapacityGrams: 3,
}
