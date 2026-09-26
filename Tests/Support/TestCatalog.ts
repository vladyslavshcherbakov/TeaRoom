import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import type { HeaterDefinition } from '../../Shared/Simulation/Definitions/HeaterDefinition.ts'
import type { RoomVessel, Spot } from '../../Shared/Simulation/Definitions/RoomDefinition.ts'
import type { TeaDefinition } from '../../Shared/Simulation/Definitions/TeaDefinition.ts'

export type CoolingPerSecond = {
  readonly kettle?: number
  readonly thermos?: number
  readonly cup?: number
  readonly caddy?: number
}

const testGreen: TeaDefinition = {
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
}

const testBlack: TeaDefinition = { ...testGreen, id: 'testBlack', balancedStrength: { lowest: 70, highest: 90 } }

const testWhite: TeaDefinition = { ...testGreen, id: 'testWhite', balancedStrength: { lowest: 20, highest: 50 } }

const gramsInEveryCaddy = 50

export function testCatalog(cooling: CoolingPerSecond = {}): Catalog {
  return {
    teas: { testGreen, testBlack, testWhite },
    vessels: {
      testKettle: {
        id: 'testKettle',
        capacityMl: 1000,
        maxPourMlPerSecond: 20,
        takesAStreamOfUpToMlPerSecond: 16,
        coolingPerSecond: cooling.kettle ?? 0,
        lid: { mustBeOpenToPour: false, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 2, heatingMultiplierWhenOpen: 0.5 },
        canSitOnHeater: true,
        isMadeForTheHeater: true,
        hasAMetalShell: false,
        canHoldLeaves: true,
        isDrinkable: false,
      },
      testThermos: {
        id: 'testThermos',
        capacityMl: 500,
        maxPourMlPerSecond: 20,
        takesAStreamOfUpToMlPerSecond: 16,
        coolingPerSecond: cooling.thermos ?? 0,
        lid: { mustBeOpenToPour: true, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 1, heatingMultiplierWhenOpen: 0.5 },
        canSitOnHeater: true,
        isMadeForTheHeater: false,
        hasAMetalShell: true,
        canHoldLeaves: false,
        isDrinkable: false,
      },
      testCup: {
        id: 'testCup',
        capacityMl: 100,
        maxPourMlPerSecond: 10,
        takesAStreamOfUpToMlPerSecond: 16,
        coolingPerSecond: cooling.cup ?? 0,
        lid: null,
        canSitOnHeater: false,
        isMadeForTheHeater: false,
        hasAMetalShell: false,
        canHoldLeaves: true,
        isDrinkable: true,
      },
      testCaddy: {
        id: 'testCaddy',
        capacityMl: 500,
        maxPourMlPerSecond: 20,
        takesAStreamOfUpToMlPerSecond: 40,
        coolingPerSecond: cooling.caddy ?? 0,
        lid: { mustBeOpenToPour: true, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 1, heatingMultiplierWhenOpen: 0.5 },
        canSitOnHeater: false,
        isMadeForTheHeater: false,
        hasAMetalShell: false,
        canHoldLeaves: true,
        isDrinkable: true,
      },
    },
    heaters: {
      testHeater: { id: 'testHeater', degreesPerSecondPerLitre: 2, powerWatts: 3000, boilingAwayMlPerSecond: 1, thermostat: { lowestC: 40, highestC: 100, startsAtC: 100, heatsAgainBelowTheTargetByC: 2 } },
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
        places: ['table'],
        keeperStartsAt: 'table',
        ritualPlaceId: 'table',
        heaterId: 'testHeater',
        heaterSpot: onTheTable(0),
        tap: { sinkSpot: onTheTable(9), waterTemperatureC: 20, flowMlPerSecond: 100 },
        vessels: [
          { id: 'kettle', definitionId: 'testKettle', initialWaterMl: 500, teaStock: null, startsAt: onTheTable(1) },
          { id: 'thermos', definitionId: 'testThermos', initialWaterMl: 0, teaStock: null, startsAt: onTheTable(2) },
          { id: 'cup1', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: onTheTable(3) },
          { id: 'cup2', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: onTheTable(4) },
          { id: 'cup3', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: onTheTable(5) },
          { id: 'caddy', definitionId: 'testCaddy', initialWaterMl: 0, teaStock: { teaId: 'testGreen', grams: gramsInEveryCaddy }, startsAt: onTheTable(6) },
        ],
        figurineIds: ['dragon', 'toad'],
        spoonCapacityGrams: 5,
        spoonStartsAt: onTheTable(7),
        cloths: [{ id: 'cloth', startsAt: onTheTable(8) }],
      },
    },
  }
}

function onTheTable(position: number): Spot {
  return { placeId: 'table', x: position, y: 0, z: 0 }
}

export function testHouseCatalog(): Catalog {
  const catalog = testCatalog()
  const room = catalog.rooms.testRoom
  if (room === undefined) throw new Error('the test catalog lost its room')
  const at = (placeId: string, x: number): Spot => ({ placeId, x, y: 0, z: 0 })
  return {
    ...catalog,
    rooms: {
      testHouse: {
        ...room,
        id: 'testHouse',
        places: ['counter', 'shelf', 'table'],
        keeperStartsAt: null,
        ritualPlaceId: 'table',
        heaterSpot: at('counter', 0),
        tap: { sinkSpot: at('counter', 9), waterTemperatureC: 20, flowMlPerSecond: 100 },
        vessels: [
          { id: 'kettle', definitionId: 'testKettle', initialWaterMl: 500, teaStock: null, startsAt: at('counter', 1) },
          { id: 'cup1', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: at('shelf', 1) },
          { id: 'cup2', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: at('shelf', 2) },
          { id: 'caddy', definitionId: 'testCaddy', initialWaterMl: 0, teaStock: { teaId: 'testGreen', grams: gramsInEveryCaddy }, startsAt: at('shelf', 3) },
        ],
        spoonStartsAt: at('table', 7),
        cloths: [{ id: 'cloth', startsAt: at('table', 8) }],
      },
    },
  }
}

export function withASecondCloth(catalog: Catalog): Catalog {
  const room = catalog.rooms['testRoom']
  if (room === undefined) throw new Error('the test catalog lost its room')
  return { ...catalog, rooms: { ...catalog.rooms, testRoom: { ...room, cloths: [...room.cloths, { id: 'cloth2', startsAt: { placeId: 'table', x: 11, y: 0, z: 0 } }] } } }
}

export function withMoreCaddies(catalog: Catalog, teaIdByCaddyId: Readonly<Record<string, string>>): Catalog {
  const room = catalog.rooms['testRoom']
  if (room === undefined) throw new Error('the test catalog lost its room')
  const caddies = Object.entries(teaIdByCaddyId).map(([id, teaId], index): RoomVessel => ({ id, definitionId: 'testCaddy', initialWaterMl: 0, teaStock: { teaId, grams: gramsInEveryCaddy }, startsAt: onTheTable(12 + index) }))
  return { ...catalog, rooms: { ...catalog.rooms, testRoom: { ...room, vessels: [...room.vessels, ...caddies] } } }
}

export function catalogWithHeaterChanges(changes: Partial<HeaterDefinition>, catalog: Catalog = testCatalog()): Catalog {
  const heater = catalog.heaters['testHeater']
  if (heater === undefined) throw new Error('the test catalog lost its heater')
  return { ...catalog, heaters: { ...catalog.heaters, testHeater: { ...heater, ...changes } } }
}
