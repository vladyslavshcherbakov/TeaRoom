import assert from 'node:assert/strict'
import test from 'node:test'
import { gardenPlants } from '../../../Apps/Game/Room/GardenLayout.ts'
import { roomHalfSize } from '../../../Apps/Game/Room/RoomLayout.ts'

test('garden_growsNothingOnTheRoomsFloor', () => {
  const plantsInside = gardenPlants(4).filter((plant) => Math.abs(plant.x) <= roomHalfSize && Math.abs(plant.z) <= roomHalfSize)

  assert.deepEqual(plantsInside, [])
})

test('garden_growsEveryFlowerTheKeeperAskedFor', () => {
  const kinds = new Set(gardenPlants(4).map((plant) => plant.kind))

  for (const kind of ['marigold', 'daisy', 'poppy', 'tulip', 'sunflower', 'rose'] as const) assert.ok(kinds.has(kind), kind)
})

test('garden_whenFlowersAreScattered_standsNoTwoFlowersOnTopOfEachOther', () => {
  const flowers = gardenPlants(4).filter((plant) => ['marigold', 'daisy', 'poppy', 'tulip'].includes(plant.kind))

  const crowdedPairs = flowers.flatMap((flower, index) => flowers.slice(index + 1).filter((other) => Math.hypot(flower.x - other.x, flower.z - other.z) < 0.16))
  assert.equal(crowdedPairs.length, 0)
})

test('garden_growsAsManySunflowersAsItIsGiven', () => {
  const sunflowers = gardenPlants(2).filter((plant) => plant.kind === 'sunflower')

  assert.equal(sunflowers.length, 2)
})
