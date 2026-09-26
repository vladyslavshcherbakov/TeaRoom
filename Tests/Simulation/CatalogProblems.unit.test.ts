import assert from 'node:assert/strict'
import test from 'node:test'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import { problemsOpeningRoom } from '../../Shared/Simulation/Definitions/CatalogProblems.ts'
import type { RoomVessel } from '../../Shared/Simulation/Definitions/RoomDefinition.ts'
import type { TeaDefinition } from '../../Shared/Simulation/Definitions/TeaDefinition.ts'
import { catalogWithRoomChanges, testCatalog } from '../Support/TestCatalog.ts'

const caddyOfTestGreen: RoomVessel = { id: 'caddy', definitionId: 'testCaddy', initialWaterMl: 0, teaStock: { teaId: 'testGreen', grams: 50 }, startsAt: { placeId: 'table', x: 3, y: 0, z: 0 } }

test('contentProblems_whenTheRoomIsMissing_nameTheRoom', () => {
  assertOneProblemNaming(problemsOpeningRoom(testCatalog(), 'attic'), 'attic')
})

test('contentProblems_whenTheRoomNamesAnUnknownHeater_nameTheHeater', () => {
  assertOneProblemNaming(problemsOpeningRoom(catalogWithRoomChanges({ heaterId: 'campfire' }), 'testRoom'), 'campfire')
})

test('contentProblems_whenTheRoomOffersNoWeather_nameTheRoom', () => {
  assertOneProblemNaming(problemsOpeningRoom(catalogWithRoomChanges({ weathers: [] }), 'testRoom'), 'testRoom')
})

test('contentProblems_whenTheRoomOffersNoTimeOfDay_nameTheRoom', () => {
  assertOneProblemNaming(problemsOpeningRoom(catalogWithRoomChanges({ timesOfDay: [] }), 'testRoom'), 'testRoom')
})

test('contentProblems_whenAVesselOfTheRoomIsOfAnUnknownDefinition_nameTheDefinitionAndTheVessel', () => {
  const catalog = catalogWithRoomChanges({ vessels: [caddyOfTestGreen, { ...caddyOfTestGreen, id: 'teapot', definitionId: 'testTeapot', teaStock: null }] })

  assertOneProblemNaming(problemsOpeningRoom(catalog, 'testRoom'), 'testTeapot', 'teapot')
})

test('contentProblems_whenTheRoomNamesAnUnknownFigurine_nameTheFigurine', () => {
  assertOneProblemNaming(problemsOpeningRoom(catalogWithRoomChanges({ figurineIds: ['dragon', 'monk'] }), 'testRoom'), 'monk')
})

test('contentProblems_whenAnItemStartsAtAPlaceTheRoomDoesNotHave_nameThePlace', () => {
  assertOneProblemNaming(problemsOpeningRoom(catalogWithRoomChanges({ spoonStartsAt: { placeId: 'attic', x: 0, y: 0, z: 0 } }), 'testRoom'), 'attic')
})

test('contentProblems_whenAVesselIdRepeats_nameTheIdOnce', () => {
  const cup = { ...caddyOfTestGreen, id: 'cup1', definitionId: 'testCup', teaStock: null }
  const catalog = catalogWithRoomChanges({ vessels: [cup, cup, cup, caddyOfTestGreen] })

  assertOneProblemNaming(problemsOpeningRoom(catalog, 'testRoom'), 'cup1')
})

test('contentProblems_whenAVesselHasTheSpoonsId_nameTheId', () => {
  const catalog = catalogWithRoomChanges({ vessels: [{ ...caddyOfTestGreen, id: 'spoon', definitionId: 'testCup', teaStock: null }, caddyOfTestGreen] })

  assertOneProblemNaming(problemsOpeningRoom(catalog, 'testRoom'), 'spoon')
})

test('contentProblems_whenTheRoomHasNoCaddy_nameTheRoom', () => {
  const catalog = catalogWithRoomChanges({ vessels: [{ ...caddyOfTestGreen, id: 'cup1', definitionId: 'testCup', teaStock: null }] })

  assertOneProblemNaming(problemsOpeningRoom(catalog, 'testRoom'), 'testRoom')
})

test('contentProblems_whenACaddyKeepsAnUnknownTea_nameTheTeaAndTheCaddy', () => {
  const catalog = catalogWithRoomChanges({ vessels: [{ ...caddyOfTestGreen, teaStock: { teaId: 'matcha', grams: 50 } }] })

  assertOneProblemNaming(problemsOpeningRoom(catalog, 'testRoom'), 'matcha', 'caddy')
})

test('contentProblems_whenTeaIsKeptInAVesselThatCannotHoldLeavesOrHasNoLid_nameEachVessel', () => {
  const catalog = catalogWithRoomChanges({
    vessels: [
      { ...caddyOfTestGreen, id: 'thermos', definitionId: 'testThermos' },
      { ...caddyOfTestGreen, id: 'cup1', definitionId: 'testCup' },
    ],
  })

  const problems = problemsOpeningRoom(catalog, 'testRoom')

  assert.equal(problems.length, 2, problems.join('\n'))
  assert.match(problems[0] ?? '', /"thermos"/)
  assert.match(problems[1] ?? '', /"cup1"/)
})

test('contentProblems_whenAFigurineLikesAnUnknownTea_nameTheFigurineAndTea', () => {
  const catalog = testCatalog()
  const brokenCatalog: Catalog = {
    ...catalog,
    figurines: { ...catalog.figurines, monk: { id: 'monk', affinityByTeaId: { matcha: 2 }, preferredStrength: { lowest: 40, highest: 60 } } },
  }

  assertOneProblemNaming(problemsOpeningRoom(brokenCatalog, 'testRoom'), 'monk', 'matcha')
})

test('contentProblems_whenATeasGoodRangeLeavesItsAcceptableRange_nameTheTea', () => {
  const catalog = catalogWithTestGreenChanges((tea) => ({ ...tea, water: { ...tea.water, good: { lowestC: 65, highestC: 85 } } }))

  assertOneProblemNaming(problemsOpeningRoom(catalog, 'testRoom'), 'testGreen')
})

test('contentProblems_whenATeaAcceptsWaterAboveBoiling_nameTheTea', () => {
  const catalog = catalogWithTestGreenChanges((tea) => ({ ...tea, water: { ...tea.water, acceptable: { lowestC: 70, highestC: 101 } } }))

  assertOneProblemNaming(problemsOpeningRoom(catalog, 'testRoom'), 'testGreen')
})

test('contentProblems_whenATeasBalancedStrengthIsOutOfOrder_nameTheTea', () => {
  const catalog = catalogWithTestGreenChanges((tea) => ({ ...tea, balancedStrength: { lowest: 70, highest: 40 } }))

  assertOneProblemNaming(problemsOpeningRoom(catalog, 'testRoom'), 'testGreen')
})

test('room_withAClothSharingAnIdWithAVessel_isRefusedNamingThatCloth', () => {
  const room = testCatalog().rooms['testRoom']
  if (room === undefined) throw new Error('the test catalog lost its room')
  const clothAsACup = { id: 'cup1', startsAt: { placeId: 'table', x: 9, y: 0, z: 0 } }

  assertOneProblemNaming(problemsOpeningRoom(catalogWithRoomChanges({ cloths: [...room.cloths, clothAsACup] }), 'testRoom'), 'cup1')
})

function assertOneProblemNaming(problems: readonly string[], ...ids: readonly string[]): void {
  assert.equal(problems.length, 1, problems.join('\n'))
  for (const id of ids) assert.ok(problems[0]?.includes(`"${id}"`), `${problems[0]} does not name "${id}"`)
}

function catalogWithTestGreenChanges(change: (tea: TeaDefinition) => TeaDefinition): Catalog {
  const catalog = testCatalog()
  const tea = catalog.teas['testGreen']
  if (tea === undefined) throw new Error('the test catalog lost its tea')
  return { ...catalog, teas: { ...catalog.teas, testGreen: change(tea) } }
}
