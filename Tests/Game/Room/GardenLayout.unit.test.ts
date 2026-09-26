import assert from 'node:assert/strict'
import test from 'node:test'
import { gardenPlants, gardenSectorCount, gardenSectorOf } from '../../../Apps/Game/Room/GardenLayout.ts'
import { roomHalfSize } from '../../../Apps/Game/Room/RoomLayout.ts'

test('garden_growsNothingOnTheRoomsFloor', () => {
  const plantsInside = gardenPlants().filter((plant) => Math.abs(plant.x) <= roomHalfSize && Math.abs(plant.z) <= roomHalfSize)

  assert.deepEqual(plantsInside, [])
})

test('garden_growsEveryFlowerTheKeeperAskedFor', () => {
  const kinds = new Set(gardenPlants().map((plant) => plant.kind))

  for (const kind of ['marigold', 'daisy', 'poppy', 'tulip', 'rose'] as const) assert.ok(kinds.has(kind), kind)
})

test('garden_whenFlowersAreScattered_standsNoTwoFlowersOnTopOfEachOther', () => {
  const flowers = gardenPlants().filter((plant) => ['marigold', 'daisy', 'poppy', 'tulip'].includes(plant.kind))

  const crowdedPairs = flowers.flatMap((flower, index) => flowers.slice(index + 1).filter((other) => Math.hypot(flower.x - other.x, flower.z - other.z) < 0.16))
  assert.equal(crowdedPairs.length, 0)
})

test('gardenSector_ofPlantsOnEightSidesOfTheHouse_isADifferentSectorForEach', () => {
  const sides = Array.from({ length: 8 }, (_, index) => ({ x: Math.cos(-Math.PI + (index + 0.5) * (Math.PI / 4)) * 10, z: Math.sin(-Math.PI + (index + 0.5) * (Math.PI / 4)) * 10 }))

  assert.deepEqual(sides.map(gardenSectorOf), [0, 1, 2, 3, 4, 5, 6, 7])
})

test('garden_growsPlantsInEverySector', () => {
  const sectors = new Set(gardenPlants().map(gardenSectorOf))

  assert.equal(sectors.size, gardenSectorCount)
})
