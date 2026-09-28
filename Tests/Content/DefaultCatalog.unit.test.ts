import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { quietRoomArrangedAs, quietRoomArrangements } from '../../Shared/Content/Rooms.ts'
import { problemsOpeningRoom } from '../../Shared/GameLogic/Definitions/CatalogProblems.ts'

test('everyDefaultRoom_opensWithNoContentProblems', () => {
  for (const roomId of Object.keys(defaultCatalog.rooms)) {
    assert.deepEqual(problemsOpeningRoom(defaultCatalog, roomId), [], roomId)
  }
})

test('quietRoom_inEveryArrangement_opensWithNoContentProblems', () => {
  for (const arrangement of quietRoomArrangements) {
    const room = quietRoomArrangedAs(arrangement)
    const catalog = { ...defaultCatalog, rooms: { ...defaultCatalog.rooms, [room.id]: room } }

    assert.deepEqual(problemsOpeningRoom(catalog, room.id), [], JSON.stringify(arrangement))
  }
})

test('quietRoom_inEveryArrangement_startsWithOneClothAtThePlaceItsArrangementNames', () => {
  const placeIdByClothPlace = { onTheTeaTable: 'teaTable', onTheShelf: 'shelf', onTheCounter: 'counter' } as const

  const clothsByArrangement = quietRoomArrangements.map((arrangement) => quietRoomArrangedAs(arrangement).cloths.map((cloth) => `${cloth.id} at ${cloth.startsAt.placeId}`))

  assert.deepEqual(clothsByArrangement, quietRoomArrangements.map((arrangement) => [`cloth at ${placeIdByClothPlace[arrangement.clothPlace]}`]))
})
