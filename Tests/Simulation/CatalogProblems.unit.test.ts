import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { problemsOpeningRoom } from '../../Shared/Simulation/Definitions/CatalogProblems.ts'
import { testCatalog } from '../Support/TestCatalog.ts'

test('contentProblems_whenTheRoomIsMissing_nameTheRoom', () => {
  assert.deepEqual(problemsOpeningRoom(testCatalog(), 'attic'), ['room "attic" is not in the catalog'])
})

test('contentProblems_whenTheRoomNamesAnUnknownHeater_nameTheHeater', () => {
  const catalog = catalogWithRoomChanges({ heaterId: 'campfire' })

  assert.deepEqual(problemsOpeningRoom(catalog, 'testRoom'), ['room "testRoom" uses unknown heater "campfire"'])
})

test('contentProblems_whenTheRoomOffersNoWeather_sayWhatIsMissing', () => {
  const catalog = catalogWithRoomChanges({ weathers: [] })

  assert.deepEqual(problemsOpeningRoom(catalog, 'testRoom'), ['room "testRoom" offers no weather'])
})

test('contentProblems_whenAVesselIdRepeats_nameTheIdOnce', () => {
  const catalog = catalogWithRoomChanges({
    vessels: [
      { id: 'cup1', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: { placeId: 'table', x: 0, y: 0, z: 0 } },
      { id: 'cup1', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: { placeId: 'table', x: 1, y: 0, z: 0 } },
      { id: 'cup1', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: { placeId: 'table', x: 2, y: 0, z: 0 } },
      { id: 'caddy', definitionId: 'testCaddy', initialWaterMl: 0, teaStock: { teaId: 'testGreen', grams: 50 }, startsAt: { placeId: 'table', x: 3, y: 0, z: 0 } },
    ],
  })

  assert.deepEqual(problemsOpeningRoom(catalog, 'testRoom'), ['room "testRoom" repeats vessel id "cup1"'])
})

test('contentProblems_whenAVesselHasTheSpoonsId_nameTheId', () => {
  const catalog = catalogWithRoomChanges({
    vessels: [
      { id: 'spoon', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: { placeId: 'table', x: 0, y: 0, z: 0 } },
      { id: 'caddy', definitionId: 'testCaddy', initialWaterMl: 0, teaStock: { teaId: 'testGreen', grams: 50 }, startsAt: { placeId: 'table', x: 1, y: 0, z: 0 } },
    ],
  })

  assert.deepEqual(problemsOpeningRoom(catalog, 'testRoom'), ['room "testRoom" gives a vessel the spoon\'s id "spoon"'])
})

test('contentProblems_whenTheRoomHasNoCaddy_sayWhereTheTeaIsMissing', () => {
  const catalog = catalogWithRoomChanges({
    vessels: [{ id: 'cup1', definitionId: 'testCup', initialWaterMl: 0, teaStock: null, startsAt: { placeId: 'table', x: 0, y: 0, z: 0 } }],
  })

  assert.deepEqual(problemsOpeningRoom(catalog, 'testRoom'), ['room "testRoom" keeps its tea in no caddy'])
})

test('contentProblems_whenACaddyKeepsAnUnknownTea_nameTheTeaAndTheCaddy', () => {
  const catalog = catalogWithRoomChanges({
    vessels: [{ id: 'caddy', definitionId: 'testCaddy', initialWaterMl: 0, teaStock: { teaId: 'matcha', grams: 50 }, startsAt: { placeId: 'table', x: 0, y: 0, z: 0 } }],
  })

  assert.deepEqual(problemsOpeningRoom(catalog, 'testRoom'), ['room "testRoom" keeps unknown tea "matcha" in "caddy"'])
})

test('contentProblems_whenTeaIsKeptInAVesselThatCannotHoldLeavesOrHasNoLid_nameTheVessel', () => {
  const catalog = catalogWithRoomChanges({
    vessels: [
      { id: 'thermos', definitionId: 'testThermos', initialWaterMl: 0, teaStock: { teaId: 'testGreen', grams: 50 }, startsAt: { placeId: 'table', x: 0, y: 0, z: 0 } },
      { id: 'cup1', definitionId: 'testCup', initialWaterMl: 0, teaStock: { teaId: 'testGreen', grams: 50 }, startsAt: { placeId: 'table', x: 1, y: 0, z: 0 } },
    ],
  })

  assert.deepEqual(problemsOpeningRoom(catalog, 'testRoom'), [
    'room "testRoom" keeps tea in "thermos", which cannot hold leaves',
    'room "testRoom" keeps tea in "cup1", which has no lid',
  ])
})

test('contentProblems_whenAFigurineLikesAnUnknownTea_nameTheFigurineAndTea', () => {
  const catalog = testCatalog()
  const brokenCatalog: Catalog = {
    ...catalog,
    figurines: { ...catalog.figurines, monk: { id: 'monk', affinityByTeaId: { matcha: 2 }, preferredStrength: { lowest: 40, highest: 60 } } },
  }

  assert.deepEqual(problemsOpeningRoom(brokenCatalog, 'testRoom'), ['figurine "monk" likes unknown tea "matcha"'])
})

test('contentProblems_whenATeasGoodRangeLeavesItsAcceptableRange_nameTheTea', () => {
  const catalog = testCatalog()
  const tea = catalog.teas.testGreen
  if (tea === undefined) throw new Error('the test catalog lost its tea')
  const brokenCatalog: Catalog = {
    ...catalog,
    teas: { testGreen: { ...tea, water: { ...tea.water, good: { lowestC: 65, highestC: 85 } } } },
  }

  assert.deepEqual(problemsOpeningRoom(brokenCatalog, 'testRoom'), [
    'tea "testGreen" water ranges are not nested around its ideal 80 °C',
  ])
})

test('room_withAClothSharingAnIdWithAVessel_isRefusedNamingThatCloth', () => {
  const catalog = testCatalog()
  const room = catalog.rooms['testRoom']
  if (room === undefined) throw new Error('the test catalog lost its room')
  const clothAsACup = { id: 'cup1', startsAt: { placeId: 'table', x: 9, y: 0, z: 0 } }

  const problems = problemsOpeningRoom({ ...catalog, rooms: { testRoom: { ...room, cloths: [...room.cloths, clothAsACup] } } }, 'testRoom')

  assert.deepEqual(problems, ['room "testRoom" gives the cloth "cup1" an id another item has'])
})

function catalogWithRoomChanges(changes: Partial<Catalog['rooms'][string]>): Catalog {
  const catalog = testCatalog()
  const room = catalog.rooms.testRoom
  if (room === undefined) throw new Error('the test catalog lost its room')
  return { ...catalog, rooms: { testRoom: { ...room, ...changes } } }
}
