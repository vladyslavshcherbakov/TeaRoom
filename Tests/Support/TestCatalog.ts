import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'

export type CoolingPerSecond = {
  readonly kettle?: number
  readonly thermos?: number
  readonly cup?: number
}

export function testCatalog(cooling: CoolingPerSecond = {}): Catalog {
  return {
    teas: {
      testGreen: {
        id: 'testGreen',
        water: { idealC: 80, good: { lowestC: 75, highestC: 85 }, acceptable: { lowestC: 70, highestC: 90 } },
        steeping: { idealSeconds: 60, idealGramsPer100Ml: 1 },
        extraction: {
          strengthRatePerSecond: 0.015,
          bitternessPerSecond: 0.1,
          bitternessMultiplierAfterIdealTime: 4,
          bitternessGainPerDegreeAboveGood: 0.05,
        },
        balancedStrength: { lowest: 40, highest: 70 },
        liquorColour: '#99aa55',
      },
    },
    vessels: {
      testKettle: {
        id: 'testKettle',
        capacityMl: 1000,
        maxPourMlPerSecond: 20,
        coolingPerSecond: cooling.kettle ?? 0,
        lid: { mustBeOpenToPour: false, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 1 },
        canSitOnHeater: true,
        canHoldLeaves: true,
        isDrinkable: false,
      },
      testThermos: {
        id: 'testThermos',
        capacityMl: 500,
        maxPourMlPerSecond: 20,
        coolingPerSecond: cooling.thermos ?? 0,
        lid: { mustBeOpenToPour: true, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 1 },
        canSitOnHeater: false,
        canHoldLeaves: false,
        isDrinkable: false,
      },
      testCup: {
        id: 'testCup',
        capacityMl: 100,
        maxPourMlPerSecond: 10,
        coolingPerSecond: cooling.cup ?? 0,
        lid: null,
        canSitOnHeater: false,
        canHoldLeaves: false,
        isDrinkable: true,
      },
    },
    heaters: {
      testHeater: { id: 'testHeater', degreesPerSecondPerLitre: 2 },
    },
    figurines: {
      dragon: { id: 'dragon', affinityByTeaId: { testGreen: 0 }, preferredStrength: { lowest: 40, highest: 70 } },
      toad: { id: 'toad', affinityByTeaId: { testGreen: 1 }, preferredStrength: { lowest: 40, highest: 70 } },
    },
    rooms: {
      testRoom: {
        id: 'testRoom',
        ambientTemperatureC: 20,
        timesOfDay: ['sunset', 'dawn', 'night'],
        weathers: ['rain'],
        heaterId: 'testHeater',
        vessels: [
          { id: 'kettle', definitionId: 'testKettle', initialWaterMl: 500 },
          { id: 'thermos', definitionId: 'testThermos', initialWaterMl: 0 },
          { id: 'cup1', definitionId: 'testCup', initialWaterMl: 0 },
          { id: 'cup2', definitionId: 'testCup', initialWaterMl: 0 },
          { id: 'cup3', definitionId: 'testCup', initialWaterMl: 0 },
        ],
        figurineIds: ['dragon', 'toad'],
        caddyGrams: 50,
        spoonCapacityGrams: 5,
      },
    },
  }
}
